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
  floor_en: string | null;
  available_from: string | null;
  available_from_en: string | null;
  type: string | null;
  type_en: string | null;
  year_built: string | null;
  year_built_en: string | null;
  condition: string | null;
  condition_en: string | null;
  heating: string | null;
  heating_en: string | null;
  energy_sources: string | null;
  energy_sources_en: string | null;
  energy_consumption: string | null;
  energy_consumption_en: string | null;
  energy_cert: string | null;
  energy_cert_en: string | null;
  kitchen: boolean | null;
  hausgeld: number | null;
  agency_fee: string | null;
  agency_fee_en: string | null;
  parking: string | null;
  parking_en: string | null;
  elevator: string | null;
  elevator_en: string | null;
  listed_building: string | null;
  listed_building_en: string | null;
  renovation: string | null;
  renovation_en: string | null;
  rented: string | null;
  rented_en: string | null;
  deposit: string | null;
  deposit_en: string | null;
  district: string | null;
  district_en: string | null;
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
  would_buy_en: string | null;
  pros: string | null;
  pros_en: string | null;
  cons: string | null;
  cons_en: string | null;
  zone_rating: string | null;
  zone_rating_en: string | null;
  hbf_walk_time: number | null;
  hbf_walk_dist: number | null;
  hbf_bike_time: number | null;
  hbf_bike_dist: number | null;
  hbf_transit_time: number | null;
  hbf_straight_dist: number | null;
  hbf_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApartmentInsert = Omit<Apartment, 'id' | 'price_per_m2' | 'created_at' | 'updated_at' | 
  'title_en' | 'floor_en' | 'available_from_en' | 'type_en' | 'year_built_en' | 
  'condition_en' | 'heating_en' | 'energy_sources_en' | 'energy_consumption_en' | 
  'energy_cert_en' | 'parking_en' | 'elevator_en' | 'listed_building_en' | 
  'renovation_en' | 'rented_en' | 'deposit_en' | 
  'district_en' | 'description_en' | 'equipment_en' | 'location_description_en' | 
  'would_buy_en' | 'pros_en' | 'cons_en' | 'zone_rating_en' | 'agency_fee_en' |
  'hbf_walk_time' | 'hbf_walk_dist' | 'hbf_bike_time' | 'hbf_bike_dist' | 
  'hbf_transit_time' | 'hbf_straight_dist' | 'hbf_calculated_at'> & {
  id?: string;
};

export type SortField = 'price' | 'price_per_m2' | 'area' | 'rooms' | 'preference_rating' | 'combined_visit_date';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  rooms: number[];
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  userFilter: ('user1' | 'user2')[];
  bothUsersFilter: boolean;
  visitedFilter: 'all' | 'visited' | 'not_visited';
  sortBy: SortField;
  sortDir: SortDirection;
  searchQuery: string;
}

export const DEFAULT_FILTERS: FilterState = {
  rooms: [],
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  userFilter: [],
  bothUsersFilter: false,
  visitedFilter: 'all',
  sortBy: 'price',
  sortDir: 'desc',
  searchQuery: '',
};
