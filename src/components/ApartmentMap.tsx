'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { geocodeAddress } from '@/lib/geocode';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ApartmentMapProps {
  apartments: Apartment[];
}

// Leipzig center coordinates
const LEIPZIG_CENTER: [number, number] = [51.3397, 12.3731];

export default function ApartmentMap({ apartments }: ApartmentMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { selectedApartmentId, setSelectedApartment, updateApartment } = useStore();

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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
  }, []);

  // Geocode apartments missing coordinates
  useEffect(() => {
    const toGeocode = apartments.filter(
      (a) => a.address && a.latitude == null && a.longitude == null
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
  }, [apartments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apartments with valid coordinates
  const geoApartments = useMemo(
    () => apartments.filter((a) => a.latitude != null && a.longitude != null),
    [apartments]
  );

  // Update markers when apartments or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    geoApartments.forEach((apt) => {
      const isSelected = apt.id === selectedApartmentId;
      const userClass = apt.user1_favorite
        ? 'user1'
        : apt.user2_favorite
        ? 'user2'
        : '';

      const icon = L.divIcon({
        className: '',
        html: `<div class="price-marker ${isSelected ? 'selected' : ''} ${userClass}">
          ${formatPrice(apt.price)}
        </div>`,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      const marker = L.marker([apt.latitude!, apt.longitude!], { icon }).addTo(
        map
      );

      marker.on('click', () => {
        setSelectedApartment(apt.id);
      });

      // Tooltip with title
      if (apt.title) {
        marker.bindTooltip(apt.title, {
          direction: 'top',
          offset: [0, -16],
        });
      }

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (geoApartments.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [geoApartments, selectedApartmentId, setSelectedApartment]);

  // Pan to selected apartment
  useEffect(() => {
    if (!mapRef.current || !selectedApartmentId) return;
    const apt = geoApartments.find((a) => a.id === selectedApartmentId);
    if (apt && apt.latitude != null && apt.longitude != null) {
      mapRef.current.flyTo([apt.latitude, apt.longitude], 15, {
        duration: 0.5,
      });
    }
  }, [selectedApartmentId, geoApartments]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-border">
      <div ref={containerRef} className="h-full w-full" />
      {geoApartments.length === 0 && (
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
