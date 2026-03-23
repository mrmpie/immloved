'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { extractImmoscoutId } from '@/lib/utils';
import { ApartmentInsert } from '@/lib/types';
import { Plus, Link, X, Languages, Loader2 } from 'lucide-react';
import { translateText, TRANSLATABLE_FIELDS } from '@/lib/translate';
import { Apartment } from '@/lib/types';

export default function AddApartmentDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { addApartment, updateApartment } = useStore();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const immoscoutId = extractImmoscoutId(url);
      
      // Check for duplicates
      if (immoscoutId) {
        const { apartments } = useStore.getState();
        const existing = apartments.find(a => a.immoscout_id === immoscoutId);
        if (existing) {
          setError('This apartment already exists in your favorites!');
          setLoading(false);
          return;
        }
      }

      // Geocode address if provided
      let lat: number | null = null;
      let lng: number | null = null;
      
      if (address && address.trim()) {
        try {
          const { geocodeAddress } = await import('@/lib/geocode');
          const coords = await geocodeAddress(address.trim());
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        } catch (geocodeError) {
          console.warn('Geocoding failed, continuing without coordinates:', geocodeError);
        }
      }
      
      const apt: ApartmentInsert = {
        immoscout_id: immoscoutId,
        url: url || null,
        title: title || null,
        address: address || null,
        latitude: lat,
        longitude: lng,
        price: price ? parseFloat(price) : null,
        area: area ? parseFloat(area) : null,
        rooms: rooms ? parseFloat(rooms) : null,
        bedrooms: null,
        bathrooms: null,
        floor: null,
        available_from: null,
        type: null,
        year_built: null,
        condition: null,
        heating: null,
        energy_sources: null,
        energy_consumption: null,
        energy_cert: null,
        kitchen: null,
        hausgeld: null,
        agency_fee: null,
        parking: null,
        elevator: null,
        listed_building: null,
        renovation: null,
        rented: null,
        deposit: null,
        district: null,
        description: null,
        equipment: null,
        location_description: null,
        contact_name: null,
        contact_company: null,
        contact_phone: null,
        contact_email: null,
        company_website: null,
        thumbnail_url: null,
        other_urls: null,
        is_favorite: true,
        is_removed: false,
        user1_favorite: false,
        user2_favorite: false,
        user1_comment: null,
        user2_comment: null,
        user1_visited: false,
        user1_visit_date: null,
        user2_visited: false,
        user2_visit_date: null,
        preference_rating: null,
        rank_order: null,
        would_buy: null,
        pros: null,
        cons: null,
        zone_rating: null,
      };

      // Translate title before inserting
      if (apt.title) {
        setStatus('Translating title...');
        try {
          const translated = await translateText(apt.title);
          if (translated) {
            (apt as Record<string, unknown>).title_en = translated;
          }
        } catch { /* continue without translation */ }
      }

      setStatus('Adding apartment...');
      await addApartment(apt);

      // Background-translate remaining fields for the newly added apartment
      const freshApartments = useStore.getState().apartments;
      const added = freshApartments.find(a =>
        (immoscoutId && a.immoscout_id === immoscoutId) ||
        (apt.url && a.url === apt.url) ||
        (apt.title && a.title === apt.title)
      );
      if (added) {
        // Fire-and-forget background translation
        (async () => {
          const updates: Partial<Apartment> = {};
          let anyDone = false;
          for (const [src, tgt] of TRANSLATABLE_FIELDS) {
            const srcVal = added[src as keyof Apartment] as string | null;
            const tgtVal = added[tgt as keyof Apartment] as string | null;
            if (srcVal && srcVal.trim() !== '' && (tgtVal == null || tgtVal.trim() === '')) {
              try {
                const result = await translateText(srcVal);
                if (result) {
                  (updates as Record<string, string>)[tgt] = result;
                  anyDone = true;
                }
              } catch { /* skip */ }
              await new Promise((r) => setTimeout(r, 500));
            }
          }
          if (anyDone && Object.keys(updates).length > 0) {
            await updateApartment(added.id, updates);
          }
        })();
      }

      setUrl('');
      setTitle('');
      setAddress('');
      setPrice('');
      setArea('');
      setRooms('');
      setStatus(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add apartment');
      console.error('Error adding apartment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Apartment
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add Apartment</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              <Link className="inline h-3 w-3 mr-1" />
              ImmobilienScout24 URL (paste link)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.immobilienscout24.de/expose/..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Apartment title..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, ZIP..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Price (€)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="250000"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Area (m²)</label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="80"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Rooms</label>
              <input
                type="number"
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                placeholder="3"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (status || 'Adding...') : 'Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  );
}
