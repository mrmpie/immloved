'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import ApartmentList from '@/components/ApartmentList';
import FilterBar from '@/components/FilterBar';
import { Trash2 } from 'lucide-react';

export default function RemovedPage() {
  const { removedApartments, fetchRemovedApartments, loading } = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    fetchRemovedApartments();
  }, [fetchRemovedApartments]);

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-screen-lg p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-destructive" />
          Removed Apartments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Apartments you&apos;ve removed from favorites. You can restore them anytime.
        </p>
      </div>

      <div className="mb-4">
        <FilterBar />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : removedApartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">🗑️</span>
          <p className="text-lg font-medium text-muted-foreground">No removed apartments</p>
          <p className="text-sm text-muted-foreground">
            Apartments you remove from favorites will appear here
          </p>
        </div>
      ) : (
        <ApartmentList apartments={removedApartments} showRestore />
      )}
    </div>
  );
}
