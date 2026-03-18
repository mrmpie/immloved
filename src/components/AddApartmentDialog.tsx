'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { extractImmoscoutId } from '@/lib/utils';
import { ApartmentInsert } from '@/lib/types';
import { Plus, Link, X } from 'lucide-react';

export default function AddApartmentDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState('');
  const { addApartment } = useStore();

  const handleSubmit = async () => {
    const immoscoutId = extractImmoscoutId(url);
    const apt: ApartmentInsert = {
      immoscout_id: immoscoutId,
      url: url || null,
      title: title || null,
      title_en: null,
      address: address || null,
      latitude: null,
      longitude: null,
      price: price ? parseFloat(price) : null,
      area: area ? parseFloat(area) : null,
      rooms: rooms ? parseFloat(rooms) : null,
      bedrooms: null,
      bathrooms: null,
      floor: null,
      floor_en: null,
      available_from: null,
      available_from_en: null,
      type: null,
      type_en: null,
      year_built: null,
      year_built_en: null,
      condition: null,
      condition_en: null,
      heating: null,
      heating_en: null,
      energy_sources: null,
      energy_sources_en: null,
      energy_consumption: null,
      energy_consumption_en: null,
      energy_cert: null,
      energy_cert_en: null,
      parking: null,
      parking_en: null,
      elevator: null,
      elevator_en: null,
      listed_building: null,
      listed_building_en: null,
      renovation: null,
      renovation_en: null,
      rented: null,
      rented_en: null,
      rental_income: null,
      rental_income_en: null,
      deposit: null,
      deposit_en: null,
      district: null,
      district_en: null,
      description: null,
      description_en: null,
      equipment: null,
      equipment_en: null,
      location_description: null,
      location_description_en: null,
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
      would_buy_en: null,
      pros: null,
      pros_en: null,
      cons: null,
      cons_en: null,
      zone_rating: null,
      zone_rating_en: null,
    };

    await addApartment(apt);
    setUrl('');
    setTitle('');
    setAddress('');
    setPrice('');
    setArea('');
    setRooms('');
    setOpen(false);
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Add to Favorites
          </button>
        </div>
      </div>
    </div>
  );
}
