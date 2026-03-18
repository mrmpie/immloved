'use client';

import { useStore } from '@/lib/store';
import { SortField } from '@/lib/types';
import {
  ArrowUpDown,
  Filter,
  SortAsc,
  SortDesc,
  User,
  Search,
} from 'lucide-react';

const ROOM_OPTIONS = [null, 1, 2, 3, 4, 5];
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'price', label: 'Price' },
  { value: 'price_per_m2', label: 'Price/m²' },
  { value: 'area', label: 'Area' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'preference_rating', label: 'Preference' },
  { value: 'rank_order', label: 'Custom Rank' },
];

export default function FilterBar() {
  const { filters, setFilters } = useStore();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search title, address..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="w-full rounded-lg border border-border bg-muted/50 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Rooms filter */}
      <div className="flex items-center gap-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Rooms:</span>
        {ROOM_OPTIONS.map((r) => (
          <button
            key={r ?? 'all'}
            onClick={() => setFilters({ rooms: r })}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              filters.rooms === r
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {r === null ? 'All' : `${r}`}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value as SortField })}
          className="rounded-lg border border-border bg-muted/50 py-1.5 pl-2 pr-6 text-xs outline-none focus:border-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            setFilters({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })
          }
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDir === 'asc' ? (
            <SortAsc className="h-3.5 w-3.5" />
          ) : (
            <SortDesc className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* User filter */}
      <div className="flex items-center gap-1">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        {(['all', 'user1', 'user2'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setFilters({ userFilter: u })}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              filters.userFilter === u
                ? 'bg-secondary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {u === 'all' ? 'All' : u === 'user1' ? '💖 User 1' : '💙 User 2'}
          </button>
        ))}
      </div>

      {/* Visited filter */}
      <div className="flex items-center gap-1">
        {(['all', 'visited', 'not_visited'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilters({ visitedFilter: v })}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              filters.visitedFilter === v
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {v === 'all' ? '👁 All' : v === 'visited' ? '✅ Visited' : '🔲 Not visited'}
          </button>
        ))}
      </div>
    </div>
  );
}
