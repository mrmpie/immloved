import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './supabase';
import { Apartment, ApartmentInsert, FilterState, DEFAULT_FILTERS } from './types';

interface AppState {
  apartments: Apartment[];
  removedApartments: Apartment[];
  filters: FilterState;
  selectedApartmentId: string | null;
  centerMapApartmentId: string | null;
  filteredIds: Set<string> | null;
  loading: boolean;
  mobileTab: 'list' | 'map';
  userName1: string;
  userName2: string;

  // Actions
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedApartment: (id: string | null) => void;
  setCenterMapApartment: (id: string | null) => void;
  setFilteredIds: (ids: Set<string> | null) => void;
  setMobileTab: (tab: 'list' | 'map') => void;
  setUserName: (user: 'user1' | 'user2', name: string) => void;
  fetchApartments: () => Promise<void>;
  fetchRemovedApartments: () => Promise<void>;
  addApartment: (apt: ApartmentInsert) => Promise<void>;
  updateApartment: (id: string, updates: Partial<Apartment>) => Promise<void>;
  removeApartment: (id: string) => Promise<void>;
  restoreApartment: (id: string) => Promise<void>;
  importApartments: (apartments: ApartmentInsert[]) => Promise<void>;
}

// LocalStorage fallback when Supabase is not configured
const LS_KEY = 'immloved_apartments';

function loadFromLocalStorage(): Apartment[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(apartments: Apartment[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(apartments));
}

export const useStore = create<AppState>((set, get) => ({
  apartments: [],
  removedApartments: [],
  filters: DEFAULT_FILTERS,
  selectedApartmentId: null,
  centerMapApartmentId: null,
  filteredIds: null,
  loading: false,
  mobileTab: 'list',
  userName1: typeof window !== 'undefined' ? localStorage.getItem('immloved_userName1') || 'Maria' : 'Maria',
  userName2: typeof window !== 'undefined' ? localStorage.getItem('immloved_userName2') || 'Rodrigo' : 'Rodrigo',

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  setSelectedApartment: (id) => set({ selectedApartmentId: id }),

  setCenterMapApartment: (id) => set({ centerMapApartmentId: id }),

  setMobileTab: (tab) => set({ mobileTab: tab }),

  setFilteredIds: (ids) => set({ filteredIds: ids }),

  setUserName: (user, name) => {
    if (user === 'user1') {
      localStorage.setItem('immloved_userName1', name);
      set({ userName1: name });
    } else {
      localStorage.setItem('immloved_userName2', name);
      set({ userName2: name });
    }
  },

  fetchApartments: async () => {
    set({ loading: true });
    if (isSupabaseConfigured() && supabase) {
      const { filters } = get();
      
      // Build query dynamically based on sort selection
      let query = supabase
        .from('apartments')
        .select('*')
        .eq('is_favorite', true)
        .eq('is_removed', false);
      
      // Apply ordering based on current sort selection
      if (filters.sortBy === 'combined_visit_date') {
        // For combined visit dates, we need to sort client-side since it involves logic
        // Fetch with basic ordering and let the client handle the combined logic
        query = query.order('price', { ascending: filters.sortDir === 'asc', nullsFirst: false });
      } else if (filters.sortBy === 'preference_rating') {
        query = query.order('preference_rating', { ascending: filters.sortDir === 'asc', nullsFirst: false });
      } else {
        query = query.order('price', { ascending: filters.sortDir === 'asc', nullsFirst: false });
      }
      
      const { data, error } = await query;
      if (!error && data) {
        set({ apartments: data as Apartment[], loading: false });
      } else {
        set({ loading: false });
      }
    } else {
      const all = loadFromLocalStorage();
      set({
        apartments: all.filter((a) => a.is_favorite && !a.is_removed),
        loading: false,
      });
    }
  },

  fetchRemovedApartments: async () => {
    set({ loading: true });
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('is_removed', true)
        .order('updated_at', { ascending: false });
      if (!error && data) {
        set({ removedApartments: data as Apartment[], loading: false });
      } else {
        set({ loading: false });
      }
    } else {
      const all = loadFromLocalStorage();
      set({
        removedApartments: all.filter((a) => a.is_removed),
        loading: false,
      });
    }
  },

  addApartment: async (apt) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('apartments').insert(apt);
      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(error.message || 'Failed to add apartment to database');
      }
      await get().fetchApartments();
    } else {
      const all = loadFromLocalStorage();
      const newApt: Apartment = {
        ...apt,
        id: apt.id || crypto.randomUUID(),
        price_per_m2: apt.price && apt.area ? Math.round(apt.price / apt.area) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Apartment;
      all.push(newApt);
      saveToLocalStorage(all);
      await get().fetchApartments();
    }
  },

  updateApartment: async (id, updates) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', id);
      if (!error) {
        // Update locally without refetching to preserve scroll position
        set((state) => ({
          apartments: state.apartments.map((a) =>
            a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
          ),
        }));
      }
    } else {
      const all = loadFromLocalStorage();
      const idx = all.findIndex((a) => a.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        if (updates.price !== undefined || updates.area !== undefined) {
          const p = updates.price ?? all[idx].price;
          const a = updates.area ?? all[idx].area;
          all[idx].price_per_m2 = p && a ? Math.round(p / a) : null;
        }
        saveToLocalStorage(all);
        // Update locally without refetching to preserve scroll position
        set((state) => ({
          apartments: state.apartments.map((a) =>
            a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
          ),
        }));
      }
    }
  },

  removeApartment: async (id) => {
    const updates = { is_removed: true, is_favorite: false };
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', id);
      if (!error) {
        // Remove from local state without refetching
        set((state) => ({
          apartments: state.apartments.filter((a) => a.id !== id),
        }));
      }
    } else {
      const all = loadFromLocalStorage();
      const idx = all.findIndex((a) => a.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        saveToLocalStorage(all);
        set((state) => ({
          apartments: state.apartments.filter((a) => a.id !== id),
        }));
      }
    }
  },

  restoreApartment: async (id) => {
    const updates = { is_removed: false, is_favorite: true };
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', id);
      if (!error) {
        // Refetch to get the restored apartment
        await get().fetchApartments();
        await get().fetchRemovedApartments();
      }
    } else {
      const all = loadFromLocalStorage();
      const idx = all.findIndex((a) => a.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        saveToLocalStorage(all);
        await get().fetchApartments();
        await get().fetchRemovedApartments();
      }
    }
  },

  importApartments: async (apartments) => {
    set({ loading: true });
    if (isSupabaseConfigured() && supabase) {
      // Get all existing apartments for matching
      const { data: existingApartments } = await supabase
        .from('apartments')
        .select('*');
      
      for (const apt of apartments) {
        let existing = null;
        
        // Strategy 1: Match by immoscout_id
        if (apt.immoscout_id) {
          const { data: match } = await supabase
            .from('apartments')
            .select('id')
            .eq('immoscout_id', apt.immoscout_id)
            .single();
          existing = match;
        }
        
        // Strategy 2: Match by URL if no immoscout_id match
        if (!existing && apt.url) {
          existing = existingApartments?.find(a => a.url === apt.url);
        }
        
        // Strategy 3: Match by title + address if still no match
        if (!existing && apt.title && apt.address) {
          existing = existingApartments?.find(a => 
            a.title === apt.title && a.address === apt.address
          );
        }
        
        // Strategy 4: Match by address only as last resort
        if (!existing && apt.address) {
          existing = existingApartments?.find(a => a.address === apt.address);
        }
        
        if (existing) {
          await supabase.from('apartments').update(apt).eq('id', existing.id);
        } else {
          await supabase.from('apartments').insert(apt);
        }
      }
    } else {
      const all = loadFromLocalStorage();
      for (const apt of apartments) {
        let existingIdx = -1;
        
        // Strategy 1: Match by immoscout_id
        if (apt.immoscout_id) {
          existingIdx = all.findIndex((a) => a.immoscout_id === apt.immoscout_id);
        }
        
        // Strategy 2: Match by URL if no immoscout_id match
        if (existingIdx === -1 && apt.url) {
          existingIdx = all.findIndex((a) => a.url === apt.url);
        }
        
        // Strategy 3: Match by title + address if still no match
        if (existingIdx === -1 && apt.title && apt.address) {
          existingIdx = all.findIndex((a) => 
            a.title === apt.title && a.address === apt.address
          );
        }
        
        // Strategy 4: Match by address only as last resort
        if (existingIdx === -1 && apt.address) {
          existingIdx = all.findIndex((a) => a.address === apt.address);
        }
        
        const newApt: Apartment = {
          ...apt,
          id: apt.id || crypto.randomUUID(),
          price_per_m2: apt.price && apt.area ? Math.round(apt.price / apt.area) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Apartment;
        
        if (existingIdx >= 0) {
          // Update existing apartment, preserving original created_at
          all[existingIdx] = { 
            ...all[existingIdx], 
            ...newApt,
            created_at: all[existingIdx].created_at,
            updated_at: new Date().toISOString(),
          };
        } else {
          all.push(newApt);
        }
      }
      saveToLocalStorage(all);
    }
    await get().fetchApartments();
    set({ loading: false });
  },
}));
