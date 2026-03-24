'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { applyFilters } from '@/lib/filters';
import ApartmentCard from './ApartmentCard';

interface ApartmentListProps {
  apartments: Apartment[];
  showRestore?: boolean;
}

export default function ApartmentList({ apartments, showRestore = false }: ApartmentListProps) {
  const { filters, selectedApartmentId, setSelectedApartment, setFilteredIds } = useStore();
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  const filtered = useMemo(
    () => applyFilters(apartments, filters),
    [apartments, filters]
  );

  // Sync filtered IDs to store so map can gray out non-matching apartments
  useEffect(() => {
    const ids = new Set(filtered.map((a) => a.id));
    setFilteredIds(ids);
    return () => setFilteredIds(null);
  }, [filtered, setFilteredIds]);

  useEffect(() => {
    if (selectedApartmentId && selectedApartmentId !== prevSelectedIdRef.current) {
      setTimeout(() => {
        if (selectedCardRef.current) {
          selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
    prevSelectedIdRef.current = selectedApartmentId;
  }, [selectedApartmentId]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🏘️</span>
        <p className="text-lg font-medium text-muted-foreground">No apartments found</p>
        <p className="text-sm text-muted-foreground">
          {apartments.length > 0
            ? 'Try adjusting your filters'
            : 'Import from Excel or add apartments manually'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground px-1">
        Showing {filtered.length} of {apartments.length} apartments
      </div>
      {filtered.map((apt) => (
        <ApartmentCard
          key={apt.id}
          ref={apt.id === selectedApartmentId ? selectedCardRef : undefined}
          apartment={apt}
          isSelected={apt.id === selectedApartmentId}
          onSelect={() =>
            setSelectedApartment(apt.id === selectedApartmentId ? null : apt.id)
          }
          showRestore={showRestore}
        />
      ))}
    </div>
  );
}
