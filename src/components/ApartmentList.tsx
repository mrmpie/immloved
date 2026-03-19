'use client';

import { useMemo, useEffect } from 'react';
import { Apartment, FilterState } from '@/lib/types';
import { useStore } from '@/lib/store';
import ApartmentCard from './ApartmentCard';

interface ApartmentListProps {
  apartments: Apartment[];
  showRestore?: boolean;
}

function applyFilters(apartments: Apartment[], filters: FilterState): Apartment[] {
  let result = [...apartments];

  // Search query
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (a) =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.title_en && a.title_en.toLowerCase().includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q)) ||
        (a.district && a.district.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }

  // Rooms filter
  if (filters.rooms.length > 0) {
    result = result.filter((a) => a.rooms != null && filters.rooms.includes(Math.floor(a.rooms)));
  }

  // Price range
  if (filters.minPrice != null) {
    result = result.filter((a) => a.price != null && a.price >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    result = result.filter((a) => a.price != null && a.price <= filters.maxPrice!);
  }

  // Area range
  if (filters.minArea != null) {
    result = result.filter((a) => a.area != null && a.area >= filters.minArea!);
  }
  if (filters.maxArea != null) {
    result = result.filter((a) => a.area != null && a.area <= filters.maxArea!);
  }

  // User filter
  if (filters.userFilter.length > 0) {
    result = result.filter((a) => 
      filters.userFilter.some(user => 
        user === 'user1' ? a.user1_favorite : a.user2_favorite
      )
    );
  }

  // Both users filter
  if (filters.bothUsersFilter) {
    result = result.filter((a) => a.user1_favorite && a.user2_favorite);
  }

  // Visited filter
  if (filters.visitedFilter === 'visited') {
    result = result.filter((a) => a.user1_visited || a.user2_visited);
  } else if (filters.visitedFilter === 'not_visited') {
    result = result.filter((a) => !a.user1_visited && !a.user2_visited);
  }

  // Sort
  const dir = filters.sortDir === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    const av = a[filters.sortBy as keyof Apartment];
    const bv = b[filters.sortBy as keyof Apartment];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  return result;
}

export default function ApartmentList({ apartments, showRestore = false }: ApartmentListProps) {
  const { filters, selectedApartmentId, setSelectedApartment, setFilteredIds } = useStore();

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
