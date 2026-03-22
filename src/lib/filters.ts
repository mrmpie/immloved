import { Apartment, FilterState } from './types';

export function applyFilters(apartments: Apartment[], filters: FilterState): Apartment[] {
  let result = [...apartments];

  // Search query
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (a) =>
        // Basic info
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.title_en && a.title_en.toLowerCase().includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q)) ||
        (a.district && a.district.toLowerCase().includes(q)) ||
        (a.district_en && a.district_en.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.description_en && a.description_en.toLowerCase().includes(q)) ||
        (a.type && a.type.toLowerCase().includes(q)) ||
        (a.type_en && a.type_en.toLowerCase().includes(q)) ||
        (a.condition && a.condition.toLowerCase().includes(q)) ||
        (a.condition_en && a.condition_en.toLowerCase().includes(q)) ||
        (a.heating && a.heating.toLowerCase().includes(q)) ||
        (a.heating_en && a.heating_en.toLowerCase().includes(q)) ||
        (a.floor && a.floor.toLowerCase().includes(q)) ||
        (a.floor_en && a.floor_en.toLowerCase().includes(q)) ||
        (a.year_built && a.year_built.toLowerCase().includes(q)) ||
        (a.year_built_en && a.year_built_en.toLowerCase().includes(q)) ||
        (a.available_from && a.available_from.toLowerCase().includes(q)) ||
        (a.available_from_en && a.available_from_en.toLowerCase().includes(q)) ||
        (a.parking && a.parking.toLowerCase().includes(q)) ||
        (a.parking_en && a.parking_en.toLowerCase().includes(q)) ||
        (a.elevator && a.elevator.toLowerCase().includes(q)) ||
        (a.elevator_en && a.elevator_en.toLowerCase().includes(q)) ||
        (a.energy_cert && a.energy_cert.toLowerCase().includes(q)) ||
        (a.energy_cert_en && a.energy_cert_en.toLowerCase().includes(q)) ||
        (a.agency_fee && a.agency_fee.toLowerCase().includes(q)) ||
        (a.agency_fee_en && a.agency_fee_en.toLowerCase().includes(q)) ||
        // Contact information
        (a.contact_name && a.contact_name.toLowerCase().includes(q)) ||
        (a.contact_company && a.contact_company.toLowerCase().includes(q)) ||
        (a.contact_phone && a.contact_phone.toLowerCase().includes(q)) ||
        (a.contact_email && a.contact_email.toLowerCase().includes(q)) ||
        (a.company_website && a.company_website.toLowerCase().includes(q)) ||
        // User comments and ratings
        (a.user1_comment && a.user1_comment.toLowerCase().includes(q)) ||
        (a.user2_comment && a.user2_comment.toLowerCase().includes(q)) ||
        (a.pros && a.pros.toLowerCase().includes(q)) ||
        (a.pros_en && a.pros_en.toLowerCase().includes(q)) ||
        (a.cons && a.cons.toLowerCase().includes(q)) ||
        (a.cons_en && a.cons_en.toLowerCase().includes(q)) ||
        (a.would_buy && a.would_buy.toLowerCase().includes(q)) ||
        (a.would_buy_en && a.would_buy_en.toLowerCase().includes(q)) ||
        (a.zone_rating && a.zone_rating.toLowerCase().includes(q)) ||
        (a.zone_rating_en && a.zone_rating_en.toLowerCase().includes(q)) ||
        // Location and equipment
        (a.location_description && a.location_description.toLowerCase().includes(q)) ||
        (a.location_description_en && a.location_description_en.toLowerCase().includes(q)) ||
        (a.equipment && a.equipment.toLowerCase().includes(q)) ||
        (a.equipment_en && a.equipment_en.toLowerCase().includes(q)) ||
        // URLs and IDs
        (a.url && a.url.toLowerCase().includes(q)) ||
        (a.immoscout_id && a.immoscout_id.toLowerCase().includes(q)) ||
        (a.other_urls && a.other_urls.toLowerCase().includes(q)) ||
        // Numeric fields (as strings for searching)
        (a.price != null && a.price.toString().includes(q)) ||
        (a.area != null && a.area.toString().includes(q)) ||
        (a.rooms != null && a.rooms.toString().includes(q)) ||
        (a.bedrooms != null && a.bedrooms.toString().includes(q)) ||
        (a.bathrooms != null && a.bathrooms.toString().includes(q)) ||
        (a.year_built && a.year_built.toLowerCase().includes(q)) ||
        (a.preference_rating != null && a.preference_rating.toString().includes(q)) ||
        (a.rank_order != null && a.rank_order.toString().includes(q))
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
    // Handle combined visit date - use the earliest/latest visit from either user
    if (filters.sortBy === 'combined_visit_date') {
      const getCombinedVisitDate = (apt: Apartment) => {
        const dates = [];
        if (apt.user1_visit_date) dates.push(new Date(apt.user1_visit_date));
        if (apt.user2_visit_date) dates.push(new Date(apt.user2_visit_date));
        if (dates.length === 0) return null;
        
        // For ascending: return earliest (oldest) date
        // For descending: return latest (most recent) date
        return dir === 1 ? new Date(Math.min(...dates.map(d => d.getTime()))) 
                         : new Date(Math.max(...dates.map(d => d.getTime())));
      };
      
      const dateA = getCombinedVisitDate(a);
      const dateB = getCombinedVisitDate(b);
      
      if (dateA == null && dateB == null) return 0;
      if (dateA == null) return 1;
      if (dateB == null) return -1;
      
      return (dateA.getTime() - dateB.getTime()) * dir;
    }
    
    // Handle other fields normally
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
