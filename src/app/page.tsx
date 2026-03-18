'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import FilterBar from '@/components/FilterBar';
import ApartmentList from '@/components/ApartmentList';
import AddApartmentDialog from '@/components/AddApartmentDialog';
import { Map, List } from 'lucide-react';

const ApartmentMap = dynamic(() => import('@/components/ApartmentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
});

export default function FavoritesPage() {
  const { apartments, fetchApartments, loading, mobileTab, setMobileTab } = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    fetchApartments();
  }, [fetchApartments]);

  // Auto-fetch thumbnails for apartments that have a URL but no thumbnail
  useEffect(() => {
    if (!apartments.length) return;
    let cancelled = false;
    const fetchThumbnails = async () => {
      const missing = apartments.filter(
        (a) => a.url && !a.thumbnail_url && a.immoscout_id
      );
      for (const apt of missing) {
        if (cancelled) break;
        try {
          const res = await fetch('/api/scrape-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: apt.url }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.thumbnail) {
              const updates: Record<string, string> = { thumbnail_url: data.thumbnail };
              if (data.gallery?.length) {
                updates.other_urls = JSON.stringify(data.gallery);
              }
              await useStore.getState().updateApartment(apt.id, updates);
            }
          }
        } catch { /* skip */ }
        // Rate limit
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    fetchThumbnails();
    return () => { cancelled = true; };
  }, [apartments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Filter bar */}
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-3">
          <div className="flex-1">
            <FilterBar />
          </div>
          <AddApartmentDialog />
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="flex border-b border-border bg-white md:hidden">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          List ({apartments.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'map'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <Map className="h-4 w-4" />
          Map
        </button>
      </div>

      {/* Desktop: split view */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-screen-2xl">
          {/* List panel — always visible on desktop, toggled on mobile */}
          <div
            className={`h-full overflow-y-auto p-4 md:w-1/2 lg:w-2/5 ${
              mobileTab === 'list' ? 'w-full' : 'hidden md:block'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <ApartmentList apartments={apartments} />
            )}
          </div>

          {/* Map panel — always visible on desktop, toggled on mobile */}
          <div
            className={`h-full p-4 md:w-1/2 lg:w-3/5 ${
              mobileTab === 'map' ? 'w-full' : 'hidden md:block'
            }`}
          >
            <ApartmentMap allApartments={apartments} />
          </div>
        </div>
      </div>
    </div>
  );
}
