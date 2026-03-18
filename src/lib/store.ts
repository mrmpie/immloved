import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './supabase';
import { Apartment, ApartmentInsert, FilterState, DEFAULT_FILTERS } from './types';

interface AppState {
  apartments: Apartment[];
  removedApartments: Apartment[];
  filters: FilterState;
  selectedApartmentId: string | null;
  loading: boolean;
  mobileTab: 'list' | 'map';

  // Actions
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedApartment: (id: string | null) => void;
  setMobileTab: (tab: 'list' | 'map') => void;
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
  loading: false,
  mobileTab: 'list',

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  setSelectedApartment: (id) => set({ selectedApartmentId: id }),

  setMobileTab: (tab) => set({ mobileTab: tab }),

  fetchApartments: async () => {
    set({ loading: true });
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('is_favorite', true)
        .eq('is_removed', false)
        .order('rank_order', { ascending: true, nullsFirst: false });
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
      if (!error) await get().fetchApartments();
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
        await get().fetchApartments();
        await get().fetchRemovedApartments();
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
        await get().fetchApartments();
        await get().fetchRemovedApartments();
      }
    }
  },

  removeApartment: async (id) => {
    await get().updateApartment(id, { is_removed: true, is_favorite: false });
  },

  restoreApartment: async (id) => {
    await get().updateApartment(id, { is_removed: false, is_favorite: true });
  },

  importApartments: async (apartments) => {
    set({ loading: true });
    if (isSupabaseConfigured() && supabase) {
      // Upsert by immoscout_id
      for (const apt of apartments) {
        if (apt.immoscout_id) {
          const { data: existing } = await supabase
            .from('apartments')
            .select('id')
            .eq('immoscout_id', apt.immoscout_id)
            .single();
          if (existing) {
            await supabase.from('apartments').update(apt).eq('id', existing.id);
          } else {
            await supabase.from('apartments').insert(apt);
          }
        } else {
          await supabase.from('apartments').insert(apt);
        }
      }
    } else {
      const all = loadFromLocalStorage();
      for (const apt of apartments) {
        const existingIdx = apt.immoscout_id
          ? all.findIndex((a) => a.immoscout_id === apt.immoscout_id)
          : -1;
        const newApt: Apartment = {
          ...apt,
          id: apt.id || crypto.randomUUID(),
          price_per_m2: apt.price && apt.area ? Math.round(apt.price / apt.area) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Apartment;
        if (existingIdx >= 0) {
          all[existingIdx] = { ...all[existingIdx], ...newApt };
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
