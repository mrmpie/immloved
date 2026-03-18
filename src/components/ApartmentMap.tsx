'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { geocodeAddress } from '@/lib/geocode';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize } from 'lucide-react';

interface ApartmentMapProps {
  allApartments: Apartment[];
}

// Leipzig center coordinates
const LEIPZIG_CENTER: [number, number] = [51.3397, 12.3731];

// Utility function to validate coordinates
function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
}

export default function ApartmentMap({ allApartments }: ApartmentMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { selectedApartmentId, setSelectedApartment, updateApartment, filteredIds } = useStore();

  // Safety check: filter out any apartments with invalid coordinates at the component level
  const safeApartments = useMemo(() => {
    return allApartments.filter(apt => {
      const isValid = isValidCoordinate(apt.latitude, apt.longitude);
      if (!isValid && apt.address) {
        console.warn(`Apartment ${apt.id} has invalid coordinates, filtering out`);
      }
      return isValid;
    });
  }, [allApartments]);

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      if (!containerRef.current || mapRef.current) return;

      // Check if container has valid dimensions
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Map container has zero dimensions, delaying initialization');
        // Try again after a delay
        const timer = setTimeout(() => {
          initializeMap();
        }, 500);
        return;
      }

      const map = L.map(containerRef.current, {
        center: LEIPZIG_CENTER,
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    };

    initializeMap();

    // Add resize observer to handle mobile layout changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Geocode apartments missing coordinates
  useEffect(() => {
    const toGeocode = allApartments.filter(
      (a) => a.address && !isValidCoordinate(a.latitude, a.longitude)
    );
    if (toGeocode.length === 0) return;

    let cancelled = false;
    const doGeocode = async () => {
      for (const apt of toGeocode) {
        if (cancelled) break;
        const result = await geocodeAddress(apt.address!);
        if (result && !cancelled) {
          updateApartment(apt.id, {
            latitude: result.lat,
            longitude: result.lng,
          });
        }
        // Rate limit: 1 request per second for Nominatim
        await new Promise((r) => setTimeout(r, 1100));
      }
    };
    doGeocode();
    return () => { cancelled = true; };
  }, [allApartments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // All apartments with valid coordinates (for showing grayed-out ones)
  const geoAllApartments = useMemo(() => {
    return safeApartments; // safeApartments already contains only valid coordinates
  }, [safeApartments]);

  // Scroll list to apartment card on marker click
  const scrollToApartment = useCallback((id: string) => {
    const card = document.querySelector(`[data-apartment-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Update markers when apartments or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    geoAllApartments.forEach((apt) => {
      const isSelected = apt.id === selectedApartmentId;
      const isFiltered = filteredIds != null && !filteredIds.has(apt.id);
      const userClass = apt.user1_favorite
        ? 'user1'
        : apt.user2_favorite
        ? 'user2'
        : '';

      const classes = [
        'price-marker',
        isSelected ? 'selected' : '',
        isFiltered ? 'filtered-out' : '',
        !isFiltered ? userClass : '',
      ].filter(Boolean).join(' ');

      const icon = L.divIcon({
        className: '',
        html: `<div class="${classes}">${formatPrice(apt.price)}</div>`,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      // Additional safety check before creating marker
      if (isValidCoordinate(apt.latitude, apt.longitude)) {
        const marker = L.marker([apt.latitude!, apt.longitude!], { icon }).addTo(map);

        marker.on('click', () => {
          setSelectedApartment(apt.id);
          scrollToApartment(apt.id);
        });

        // Tooltip with title
        if (apt.title) {
          marker.bindTooltip(apt.title, {
            direction: 'top',
            offset: [0, -16],
          });
        }

        markersRef.current.push(marker);
      }
    });
  }, [geoAllApartments, selectedApartmentId, setSelectedApartment, filteredIds, scrollToApartment]);

  // Pan to selected apartment
  useEffect(() => {
    if (!mapRef.current || !selectedApartmentId) return;
    
    const apt = geoAllApartments.find((a) => a.id === selectedApartmentId);
    console.log('Selected apartment for flyTo:', { 
      selectedApartmentId, 
      apt: apt ? { 
        id: apt.id, 
        title: apt.title, 
        latitude: apt.latitude, 
        longitude: apt.longitude 
      } : null,
      isValid: apt ? isValidCoordinate(apt.latitude, apt.longitude) : false,
      mapReady: mapRef.current ? true : false
    });
    
    if (apt && isValidCoordinate(apt.latitude, apt.longitude)) {
      // Add a small delay to ensure map is ready, especially on mobile
      const flyToApartment = () => {
        if (!mapRef.current) return;
        
        try {
          mapRef.current.flyTo([apt.latitude!, apt.longitude!], 15, {
            duration: 0.5,
          });
        } catch (error) {
          console.error('Error flying to apartment:', error);
          // Fallback to setView if flyTo fails
          try {
            mapRef.current.setView([apt.latitude!, apt.longitude!], 15);
          } catch (fallbackError) {
            console.error('Error with setView fallback:', fallbackError);
          }
        }
      };
      
      // Use requestAnimationFrame to ensure the map is rendered
      requestAnimationFrame(() => {
        setTimeout(flyToApartment, 100); // Small delay for mobile
      });
    }
  }, [selectedApartmentId, geoAllApartments]);

  // Zoom to fit all visible (non-filtered) apartments
  const handleZoomToFit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibleApts = geoAllApartments.filter(
      (a) => filteredIds == null || filteredIds.has(a.id)
    );
    if (visibleApts.length === 0) return;
    const validCoords = visibleApts.filter(
      (a) => isValidCoordinate(a.latitude, a.longitude)
    );
    if (validCoords.length === 0) return;
    const bounds = L.latLngBounds(
      validCoords.map((a) => [a.latitude!, a.longitude!] as [number, number])
    );
    map.fitBounds(bounds.pad(0.1));
  }, [geoAllApartments, filteredIds]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-border">
      <div ref={containerRef} className="h-full w-full" />

      {/* Zoom-to-fit button */}
      <button
        onClick={handleZoomToFit}
        className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-foreground shadow-md border border-border hover:bg-muted transition-colors"
        title="Zoom to fit all apartments"
      >
        <Maximize className="h-3.5 w-3.5" />
        Fit All
      </button>

      {geoAllApartments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center text-sm text-muted-foreground">
            <p className="text-lg mb-1">🗺️</p>
            <p>No apartments with coordinates yet.</p>
            <p className="text-xs">Addresses will be geocoded automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
