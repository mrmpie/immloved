'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { geocodeAddress } from '@/lib/geocode';
import { RefreshCw } from 'lucide-react';
import { Apartment } from '@/lib/types';

/** A field is "empty" if null, undefined, or blank string */
function isEmpty(val: unknown): boolean {
  if (val == null) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
}

/** Fields we consider "missing" and worth scraping for */
function hasMissingData(apt: Apartment): boolean {
  return (
    isEmpty(apt.title) ||
    isEmpty(apt.address) ||
    isEmpty(apt.price) ||
    isEmpty(apt.rooms) ||
    isEmpty(apt.area) ||
    isEmpty(apt.description) ||
    isEmpty(apt.floor) ||
    isEmpty(apt.type) ||
    isEmpty(apt.condition) ||
    isEmpty(apt.heating) ||
    isEmpty(apt.thumbnail_url)
  );
}

export default function BulkUpdateButton() {
  const { apartments, updateApartment } = useStore();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);

  const handleBulkUpdate = async () => {
    // Find apartments that have a URL/immoscout_id but are missing key data
    const toUpdate = apartments.filter(
      (a) => a.url && a.immoscout_id && !a.is_removed && hasMissingData(a)
    );

    if (toUpdate.length === 0) {
      setProgress('All apartments already have complete data!');
      setTimeout(() => setProgress(''), 3000);
      return;
    }

    setRunning(true);
    setTotal(toUpdate.length);
    setCurrent(0);

    let updated = 0;
    let skipped = 0;
    let unavailable = 0;

    for (let i = 0; i < toUpdate.length; i++) {
      const apt = toUpdate[i];
      setCurrent(i + 1);
      setProgress(`Scraping ${i + 1}/${toUpdate.length}: ${apt.title || apt.immoscout_id}...`);

      try {
        const res = await fetch('/api/scrape-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: apt.url }),
        });

        if (!res.ok) {
          skipped++;
          continue;
        }

        const data = await res.json();

        if (data.unavailable) {
          unavailable++;
          setProgress(`${i + 1}/${toUpdate.length}: ${apt.immoscout_id} — no longer available, skipping`);
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        if (data.botBlocked) {
          setProgress(`${i + 1}/${toUpdate.length}: Bot challenge detected, waiting longer...`);
          await new Promise((r) => setTimeout(r, 10000));
          skipped++;
          continue;
        }

        const details = data.details;
        if (!details || Object.keys(details).length === 0) {
          skipped++;
          continue;
        }

        // Build update object — only fill in fields that are currently missing
        const updates: Partial<Apartment> = {};

        // Only fill in fields that are currently null or empty string — never overwrite user data
        if (isEmpty(apt.title) && details.title) updates.title = details.title;
        if (isEmpty(apt.address) && details.address) updates.address = details.address;
        if (isEmpty(apt.price) && details.price) updates.price = details.price;
        if (isEmpty(apt.rooms) && details.rooms) updates.rooms = details.rooms;
        if (isEmpty(apt.area) && details.area) updates.area = details.area;
        if (isEmpty(apt.floor) && details.floor) updates.floor = details.floor;
        if (isEmpty(apt.available_from) && details.available_from) updates.available_from = details.available_from;
        if (isEmpty(apt.deposit) && details.deposit) updates.deposit = details.deposit;
        if (isEmpty(apt.type) && details.type) updates.type = details.type;
        if (isEmpty(apt.year_built) && details.year_built) updates.year_built = details.year_built;
        if (isEmpty(apt.condition) && details.condition) updates.condition = details.condition;
        if (isEmpty(apt.heating) && details.heating) updates.heating = details.heating;
        if (isEmpty(apt.energy_consumption) && details.energy_consumption) updates.energy_consumption = details.energy_consumption;
        if (isEmpty(apt.energy_cert) && details.energy_cert) updates.energy_cert = details.energy_cert;
        if (isEmpty(apt.energy_sources) && details.energy_sources) updates.energy_sources = details.energy_sources;
        if (isEmpty(apt.parking) && details.parking) updates.parking = details.parking;
        if (isEmpty(apt.elevator) && details.elevator) updates.elevator = details.elevator;
        if (isEmpty(apt.listed_building) && details.listed_building) updates.listed_building = details.listed_building;
        if (isEmpty(apt.description) && details.description) updates.description = details.description;
        if (isEmpty(apt.equipment) && details.equipment) updates.equipment = details.equipment;
        if (isEmpty(apt.location_description) && details.location_description) updates.location_description = details.location_description;
        if (isEmpty(apt.contact_name) && details.contact_name) updates.contact_name = details.contact_name;
        if (isEmpty(apt.contact_company) && details.contact_company) updates.contact_company = details.contact_company;
        if (isEmpty(apt.contact_phone) && details.contact_phone) updates.contact_phone = details.contact_phone;
        if (isEmpty(apt.thumbnail_url) && details.thumbnail_url) updates.thumbnail_url = details.thumbnail_url;
        if (isEmpty(apt.other_urls) && details.other_urls) updates.other_urls = details.other_urls;

        // Geocode if we got a new address and the apartment has no coordinates
        if (updates.address && !apt.latitude && !apt.longitude) {
          try {
            const coords = await geocodeAddress(updates.address);
            if (coords) {
              updates.latitude = coords.lat;
              updates.longitude = coords.lng;
            }
          } catch { /* skip geocoding */ }
          // Rate limit Nominatim
          await new Promise((r) => setTimeout(r, 1100));
        }

        if (Object.keys(updates).length > 0) {
          await updateApartment(apt.id, updates);
          updated++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }

      // Rate limit between requests
      await new Promise((r) => setTimeout(r, 1500));
    }

    setRunning(false);
    const msg = `Done! Updated: ${updated}, Skipped: ${skipped}${unavailable > 0 ? `, Unavailable: ${unavailable}` : ''}`;
    setProgress(msg);
    setTimeout(() => setProgress(''), 8000);
  };

  const eligibleCount = apartments.filter(
    (a) => a.url && a.immoscout_id && !a.is_removed && hasMissingData(a)
  ).length;

  if (eligibleCount === 0 && !running && !progress) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBulkUpdate}
        disabled={running || eligibleCount === 0}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Update missing data for ${eligibleCount} apartments from ImmobilienScout24`}
      >
        <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
        {running ? `${current}/${total}` : `Update ${eligibleCount}`}
      </button>
      {progress && (
        <span className="text-xs text-muted-foreground max-w-[300px] truncate" title={progress}>
          {progress}
        </span>
      )}
    </div>
  );
}
