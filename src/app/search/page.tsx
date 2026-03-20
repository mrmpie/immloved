'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { extractImmoscoutId } from '@/lib/utils';
import { ApartmentInsert } from '@/lib/types';
import {
  Search,
  ExternalLink,
  Plus,
  Languages,
  ClipboardPaste,
  Globe,
} from 'lucide-react';

const IMMOSCOUT_SEARCH_URL =
  'https://www.immobilienscout24.de/Suche/de/sachsen/leipzig/wohnung-kaufen';

export default function SearchPage() {
  const { addApartment } = useStore();
  const [pasteUrl, setPasteUrl] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [searchParams, setSearchParams] = useState({
    minPrice: '',
    maxPrice: '',
    minRooms: '',
    maxRooms: '',
    minArea: '',
    maxArea: '',
  });

  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    if (searchParams.minPrice) params.set('pricetype', 'calculatedtotalprice');
    if (searchParams.minPrice) params.set('price', `${searchParams.minPrice}-${searchParams.maxPrice || ''}`);
    if (searchParams.minRooms) params.set('numberofrooms', `${searchParams.minRooms}-${searchParams.maxRooms || ''}`);
    if (searchParams.minArea) params.set('livingspace', `${searchParams.minArea}-${searchParams.maxArea || ''}`);
    const base = IMMOSCOUT_SEARCH_URL;
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const handlePasteAndAdd = async () => {
    if (!pasteUrl.trim()) return;
    const immoscoutId = extractImmoscoutId(pasteUrl);
    if (!immoscoutId) {
      setStatus('⚠️ Could not extract ImmobilienScout24 ID from URL');
      return;
    }

    const apt: ApartmentInsert = {
      immoscout_id: immoscoutId,
      url: pasteUrl.trim(),
      title: null,
      title_en: null,
      address: null,
      latitude: null,
      longitude: null,
      price: null,
      area: null,
      rooms: null,
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
      kitchen: null,
      hausgeld: null,
      agency_fee: null,
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
    setPasteUrl('');
    setStatus(`✅ Added apartment ${immoscoutId} to favorites!`);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleTranslate = async (text: string, key: string) => {
    if (!text || translated[key]) return;
    setTranslating(true);
    try {
      // Use free LibreTranslate or MyMemory API for translation
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text.slice(0, 500)
        )}&langpair=de|en`
      );
      const data = await res.json();
      if (data.responseData?.translatedText) {
        setTranslated((prev) => ({
          ...prev,
          [key]: data.responseData.translatedText,
        }));
      }
    } catch {
      setTranslated((prev) => ({ ...prev, [key]: '(Translation failed)' }));
    }
    setTranslating(false);
  };

  return (
    <div className="mx-auto max-w-screen-xl p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Search ImmobilienScout24
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search for apartments on ImmobilienScout24 and add them to your favorites
        </p>
      </div>

      {/* Quick paste URL */}
      <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <ClipboardPaste className="h-4 w-4 text-secondary" />
          Quick Add: Paste ImmobilienScout24 Link
        </h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://www.immobilienscout24.de/expose/12345..."
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === 'Enter' && handlePasteAndAdd()}
          />
          <button
            onClick={handlePasteAndAdd}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add to Favorites
          </button>
        </div>
        {status && (
          <p className="mt-2 text-sm font-medium">{status}</p>
        )}
      </div>

      {/* Search filters */}
      <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <Globe className="h-4 w-4 text-secondary" />
          Search Filters
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Min Price (€)</label>
            <input
              type="number"
              value={searchParams.minPrice}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, minPrice: e.target.value }))
              }
              placeholder="100000"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Price (€)</label>
            <input
              type="number"
              value={searchParams.maxPrice}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, maxPrice: e.target.value }))
              }
              placeholder="350000"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min Rooms</label>
            <input
              type="number"
              value={searchParams.minRooms}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, minRooms: e.target.value }))
              }
              placeholder="2"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Rooms</label>
            <input
              type="number"
              value={searchParams.maxRooms}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, maxRooms: e.target.value }))
              }
              placeholder="4"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min Area (m²)</label>
            <input
              type="number"
              value={searchParams.minArea}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, minArea: e.target.value }))
              }
              placeholder="60"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Area (m²)</label>
            <input
              type="number"
              value={searchParams.maxArea}
              onChange={(e) =>
                setSearchParams((p) => ({ ...p, maxArea: e.target.value }))
              }
              placeholder="120"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <a
            href={buildSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Search on ImmobilienScout24
          </a>
          <span className="text-xs text-muted-foreground">
            Opens in a new tab. Copy the URL of apartments you like and paste above.
          </span>
        </div>
      </div>

      {/* Translation tool */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <Languages className="h-4 w-4 text-accent" />
          Quick Translate (German → English)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Paste any German text from ImmobilienScout24 to translate it to English.
        </p>
        <textarea
          placeholder="Paste German text here..."
          className="w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary min-h-[100px]"
          id="translate-input"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => {
              const el = document.getElementById(
                'translate-input'
              ) as HTMLTextAreaElement;
              if (el?.value) handleTranslate(el.value, 'quick');
            }}
            disabled={translating}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Languages className="h-4 w-4" />
            {translating ? 'Translating...' : 'Translate'}
          </button>
        </div>
        {translated['quick'] && (
          <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="text-xs font-medium text-green-700 mb-1">English Translation:</div>
            <p className="text-sm text-green-900">{translated['quick']}</p>
          </div>
        )}
      </div>
    </div>
  );
}
