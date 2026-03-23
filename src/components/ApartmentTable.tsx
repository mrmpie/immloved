'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { applyFilters } from '@/lib/filters';
import { formatPrice, formatPricePerM2 } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown, Check, Star } from 'lucide-react';

// Column definition
interface ColumnDef {
  key: string;
  label: string;
  width: number; // min-width in px
  getValue: (apt: Apartment) => string | number | null;
  renderCell?: (apt: Apartment) => React.ReactNode;
  sortValue?: (apt: Apartment) => number | string | null;
  align?: 'left' | 'center' | 'right';
}

interface ApartmentTableProps {
  apartments: Apartment[];
}

export default function ApartmentTable({ apartments }: ApartmentTableProps) {
  const {
    filters,
    selectedApartmentId,
    setSelectedApartment,
    setCenterMapApartment,
    setFilteredIds,
    userName1,
    userName2,
  } = useStore();

  // Per-column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  // Table sort (independent from global sort)
  const [tableSortKey, setTableSortKey] = useState<string>('price');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');

  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // Column definitions
  const columns: ColumnDef[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      width: 220,
      getValue: (a) => a.title_en || a.title || '',
      renderCell: (a) => (
        <span className="font-medium line-clamp-1" title={a.title_en || a.title || ''}>
          {a.title_en || a.title || '—'}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      width: 110,
      getValue: (a) => a.price,
      renderCell: (a) => (
        <span className="font-bold text-primary whitespace-nowrap">{formatPrice(a.price)}</span>
      ),
      sortValue: (a) => a.price,
      align: 'right',
    },
    {
      key: 'area',
      label: 'm²',
      width: 70,
      getValue: (a) => a.area,
      renderCell: (a) => <span className="whitespace-nowrap">{a.area != null ? `${a.area} m²` : '—'}</span>,
      sortValue: (a) => a.area,
      align: 'right',
    },
    {
      key: 'price_per_m2',
      label: '€/m²',
      width: 90,
      getValue: (a) => a.price_per_m2,
      renderCell: (a) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatPricePerM2(a.price_per_m2)}</span>
      ),
      sortValue: (a) => a.price_per_m2,
      align: 'right',
    },
    {
      key: 'rooms',
      label: 'Rooms',
      width: 65,
      getValue: (a) => a.rooms,
      sortValue: (a) => a.rooms,
      align: 'center',
    },
    {
      key: 'bathrooms',
      label: 'Bath',
      width: 55,
      getValue: (a) => a.bathrooms,
      sortValue: (a) => a.bathrooms,
      align: 'center',
    },
    {
      key: 'floor',
      label: 'Floor',
      width: 80,
      getValue: (a) => a.floor_en || a.floor || '',
    },
    {
      key: 'hausgeld',
      label: 'Hausgeld',
      width: 90,
      getValue: (a) => a.hausgeld,
      renderCell: (a) => (
        <span className="whitespace-nowrap">{a.hausgeld != null ? `€${a.hausgeld}` : '—'}</span>
      ),
      sortValue: (a) => a.hausgeld,
      align: 'right',
    },
    {
      key: 'district',
      label: 'District',
      width: 120,
      getValue: (a) => a.district_en || a.district || '',
    },
    {
      key: 'address',
      label: 'Street',
      width: 180,
      getValue: (a) => a.address || '',
      renderCell: (a) => (
        <span className="line-clamp-1" title={a.address || ''}>
          {a.address || '—'}
        </span>
      ),
    },
    {
      key: 'hbf_transit_time',
      label: 'Hbf Transit',
      width: 90,
      getValue: (a) => a.hbf_transit_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_transit_time != null ? `~${a.hbf_transit_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_transit_time,
      align: 'center',
    },
    {
      key: 'hbf_bike_time',
      label: 'Hbf Bike',
      width: 80,
      getValue: (a) => a.hbf_bike_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_bike_time != null ? `${a.hbf_bike_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_bike_time,
      align: 'center',
    },
    {
      key: 'hbf_walk_time',
      label: 'Hbf Walk',
      width: 80,
      getValue: (a) => a.hbf_walk_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_walk_time != null ? `${a.hbf_walk_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_walk_time,
      align: 'center',
    },
    {
      key: 'pros',
      label: 'Pros',
      width: 200,
      getValue: (a) => a.pros_en || a.pros || '',
      renderCell: (a) => {
        const text = a.pros_en || a.pros || '';
        return (
          <span className="line-clamp-2 text-green-700" title={text}>
            {text || '—'}
          </span>
        );
      },
    },
    {
      key: 'cons',
      label: 'Cons',
      width: 200,
      getValue: (a) => a.cons_en || a.cons || '',
      renderCell: (a) => {
        const text = a.cons_en || a.cons || '';
        return (
          <span className="line-clamp-2 text-red-600" title={text}>
            {text || '—'}
          </span>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      width: 100,
      getValue: (a) => a.preference_rating,
      renderCell: (a) => (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-3 w-3 ${
                a.preference_rating != null && s <= a.preference_rating
                  ? 'text-accent fill-accent'
                  : 'text-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      ),
      sortValue: (a) => a.preference_rating,
      align: 'center',
    },
    {
      key: 'favorites',
      label: 'Favs',
      width: 70,
      getValue: (a) => {
        const parts = [];
        if (a.user1_favorite) parts.push(userName1);
        if (a.user2_favorite) parts.push(userName2);
        return parts.join(', ');
      },
      renderCell: (a) => (
        <div className="flex items-center gap-1">
          {a.user1_favorite && <span title={userName1}>💖</span>}
          {a.user2_favorite && <span title={userName2}>💙</span>}
        </div>
      ),
      align: 'center',
    },
    {
      key: 'visited',
      label: 'Visited',
      width: 140,
      getValue: (a) => {
        const parts = [];
        if (a.user1_visited) parts.push(`${userName1}: ${a.user1_visit_date || 'yes'}`);
        if (a.user2_visited) parts.push(`${userName2}: ${a.user2_visit_date || 'yes'}`);
        return parts.join(', ') || '';
      },
      renderCell: (a) => (
        <div className="flex flex-col gap-0.5 text-[10px]">
          {a.user1_visited && (
            <span className="text-green-600 flex items-center gap-0.5">
              <Check className="h-3 w-3" />
              {userName1}{a.user1_visit_date ? `: ${a.user1_visit_date}` : ''}
            </span>
          )}
          {a.user2_visited && (
            <span className="text-green-600 flex items-center gap-0.5">
              <Check className="h-3 w-3" />
              {userName2}{a.user2_visit_date ? `: ${a.user2_visit_date}` : ''}
            </span>
          )}
          {!a.user1_visited && !a.user2_visited && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: 100,
      getValue: (a) => a.type_en || a.type || '',
    },
    {
      key: 'condition',
      label: 'Condition',
      width: 100,
      getValue: (a) => a.condition_en || a.condition || '',
    },
    {
      key: 'year_built',
      label: 'Year',
      width: 65,
      getValue: (a) => a.year_built_en || a.year_built || '',
    },
    {
      key: 'available_from',
      label: 'Available',
      width: 100,
      getValue: (a) => a.available_from_en || a.available_from || '',
    },
    {
      key: 'heating',
      label: 'Heating',
      width: 120,
      getValue: (a) => a.heating_en || a.heating || '',
    },
    {
      key: 'elevator',
      label: 'Elevator',
      width: 80,
      getValue: (a) => a.elevator_en || a.elevator || '',
    },
    {
      key: 'parking',
      label: 'Parking',
      width: 100,
      getValue: (a) => a.parking_en || a.parking || '',
    },
    {
      key: 'deposit',
      label: 'Deposit',
      width: 100,
      getValue: (a) => a.deposit_en || a.deposit || '',
    },
    {
      key: 'agency_fee',
      label: 'Agency Fee',
      width: 100,
      getValue: (a) => a.agency_fee_en || a.agency_fee || '',
    },
    {
      key: 'contact_name',
      label: 'Contact',
      width: 140,
      getValue: (a) => a.contact_name || '',
    },
    {
      key: 'contact_company',
      label: 'Company',
      width: 140,
      getValue: (a) => a.contact_company || '',
    },
  ], [userName1, userName2]);

  // 1) Apply global filters
  const globalFiltered = useMemo(
    () => applyFilters(apartments, filters),
    [apartments, filters]
  );

  // Sync filtered IDs to store so map can gray out non-matching apartments
  useEffect(() => {
    const ids = new Set(globalFiltered.map((a) => a.id));
    setFilteredIds(ids);
    return () => setFilteredIds(null);
  }, [globalFiltered, setFilteredIds]);

  // 2) Apply per-column filters
  const columnFiltered = useMemo(() => {
    let result = globalFiltered;
    for (const [colKey, filterText] of Object.entries(columnFilters)) {
      if (!filterText.trim()) continue;
      const col = columns.find((c) => c.key === colKey);
      if (!col) continue;
      const q = filterText.toLowerCase();
      result = result.filter((apt) => {
        const val = col.getValue(apt);
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      });
    }
    return result;
  }, [globalFiltered, columnFilters, columns]);

  // 3) Apply table-level sorting
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === tableSortKey);
    if (!col) return columnFiltered;

    const getSortVal = col.sortValue || col.getValue;
    const dir = tableSortDir === 'asc' ? 1 : -1;

    return [...columnFiltered].sort((a, b) => {
      const av = getSortVal(a);
      const bv = getSortVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [columnFiltered, tableSortKey, tableSortDir, columns]);

  // Handle column header click for sorting
  const handleSort = useCallback((key: string) => {
    if (tableSortKey === key) {
      // Same column - toggle direction
      setTableSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      // Different column - set new key and reset to ascending
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  }, [tableSortKey]);

  // Handle column filter change
  const handleColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle row click
  const handleRowClick = useCallback(
    (apt: Apartment) => {
      const newId = apt.id === selectedApartmentId ? null : apt.id;
      setSelectedApartment(newId);
      if (newId) {
        setCenterMapApartment(newId);
      }
    },
    [selectedApartmentId, setSelectedApartment, setCenterMapApartment]
  );

  // Scroll selected row into view
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedApartmentId]);

  if (sorted.length === 0 && apartments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🏘️</span>
        <p className="text-lg font-medium text-muted-foreground">No apartments found</p>
        <p className="text-sm text-muted-foreground">Import from Excel or add apartments manually</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-muted-foreground px-2 py-1.5 border-b border-border bg-white shrink-0">
        Showing {sorted.length} of {apartments.length} apartments
      </div>
      <div className="flex-1 overflow-auto apartment-table-wrapper">
        <table className="apartment-table w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            {/* Header labels */}
            <tr className="bg-muted/80 backdrop-blur-sm">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-border px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer hover:bg-muted select-none whitespace-nowrap"
                  style={{ minWidth: col.width, textAlign: col.align || 'left' }}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1" style={{ justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
                    <span>{col.label}</span>
                    {tableSortKey === col.key ? (
                      tableSortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {/* Column filter inputs */}
            <tr className="bg-white border-b border-border">
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className="px-1 py-1 border-r border-border">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={columnFilters[col.key] || ''}
                    onChange={(e) => handleColumnFilter(col.key, e.target.value)}
                    className="w-full rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-normal"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((apt) => {
              const isSelected = apt.id === selectedApartmentId;
              return (
                <tr
                  key={apt.id}
                  ref={isSelected ? selectedRowRef : undefined}
                  data-apartment-id={apt.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                      : 'hover:bg-muted/50 even:bg-muted/20'
                  }`}
                  onClick={() => handleRowClick(apt)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="border-b border-r border-border px-2 py-1.5"
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.renderCell
                        ? col.renderCell(apt)
                        : (col.getValue(apt) ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
