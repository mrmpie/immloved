export interface Apartment {
  id: string;
  immoscout_id: string | null;
  url: string | null;
  title: string | null;
  title_en: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  area: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  available_from: string | null;
  type: string | null;
  year_built: string | null;
  condition: string | null;
  condition_en: string | null;
  heating: string | null;
  energy_sources: string | null;
  energy_consumption: string | null;
  energy_cert: string | null;
  parking: string | null;
  elevator: string | null;
  listed_building: string | null;
  renovation: string | null;
  rented: string | null;
  rental_income: string | null;
  deposit: string | null;
  district: string | null;
  description: string | null;
  description_en: string | null;
  equipment: string | null;
  equipment_en: string | null;
  location_description: string | null;
  location_description_en: string | null;
  contact_name: string | null;
  contact_company: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  company_website: string | null;
  thumbnail_url: string | null;
  other_urls: string | null;
  is_favorite: boolean;
  is_removed: boolean;
  user1_favorite: boolean;
  user2_favorite: boolean;
  user1_comment: string | null;
  user2_comment: string | null;
  user1_visited: boolean;
  user1_visit_date: string | null;
  user2_visited: boolean;
  user2_visit_date: string | null;
  preference_rating: number | null;
  rank_order: number | null;
  would_buy: string | null;
  pros: string | null;
  cons: string | null;
  zone_rating: string | null;
  created_at: string;
  updated_at: string;
}

export type ApartmentInsert = Omit<Apartment, 'id' | 'price_per_m2' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type SortField = 'price' | 'price_per_m2' | 'area' | 'rooms' | 'preference_rating' | 'rank_order' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  rooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  userFilter: 'all' | 'user1' | 'user2';
  visitedFilter: 'all' | 'visited' | 'not_visited';
  sortBy: SortField;
  sortDir: SortDirection;
  searchQuery: string;
}

export const DEFAULT_FILTERS: FilterState = {
  rooms: null,
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  userFilter: 'all',
  visitedFilter: 'all',
  sortBy: 'created_at',
  sortDir: 'desc',
  searchQuery: '',
};
