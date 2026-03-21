// Routing utilities for travel duration to Leipzig Hauptbahnhof
// Uses OSRM (free, no API key) for walking & cycling
// Estimates public transport from straight-line distance

const LEIPZIG_HBF = { lat: 51.3455, lng: 12.3828 };

export interface TravelDurations {
  walking: number | null;   // minutes
  cycling: number | null;   // minutes
  transit: number | null;   // minutes (estimated)
  walkingDist: number | null; // km
  cyclingDist: number | null; // km
  straightDist: number | null; // km
  googleMapsUrl: string;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetch route distance from OSRM and calculate duration with realistic speeds
// OSRM demo server returns incorrect durations, so we use distance only
async function osrmRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  profile: 'foot' | 'bike'
): Promise<{ minutes: number; distKm: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    
    if (!res.ok) return null;
    
    // Read response with size limit
    const reader = res.body?.getReader();
    if (!reader) return null;
    
    let text = '';
    const maxSize = 100 * 1024; // 100KB limit
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      
      if (text.length > maxSize) {
        reader.cancel();
        return null;
      }
    }
    
    reader.releaseLock();
    const data = JSON.parse(text);
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const distKm = route.distance / 1000;
      
      // Calculate duration with realistic speeds (OSRM durations are unreliable)
      // Walking: ~5 km/h, Cycling: ~15 km/h in urban areas
      const speedKmh = profile === 'foot' ? 5 : 15;
      const minutes = Math.round((distKm / speedKmh) * 60);
      
      return {
        minutes,
        distKm: Math.round(distKm * 10) / 10,
      };
    }
    return null;
  } catch (error) {
    // Log timeout errors for debugging
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(`OSRM route timeout for ${profile}`);
    }
    return null;
  }
}

// In-memory cache keyed by apartment id
const cache = new Map<string, TravelDurations>();

export function getCachedDurations(apartmentId: string): TravelDurations | undefined {
  return cache.get(apartmentId);
}

export async function fetchTravelDurations(
  apartmentId: string,
  lat: number,
  lng: number
): Promise<TravelDurations> {
  const cached = cache.get(apartmentId);
  if (cached) return cached;

  const straightDist = Math.round(haversineKm(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng) * 10) / 10;

  // Estimate transit: ~3 min/km with 5 min base (waiting/transfers)
  const transitEstimate = Math.round(straightDist * 3 + 5);

  // Google Maps directions URL with transit mode
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${LEIPZIG_HBF.lat},${LEIPZIG_HBF.lng}&travelmode=transit`;

  // Fetch walking & cycling routes in parallel
  const [walking, cycling] = await Promise.all([
    osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'foot'),
    osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'bike'),
  ]);

  const result: TravelDurations = {
    walking: walking?.minutes ?? null,
    cycling: cycling?.minutes ?? null,
    transit: transitEstimate,
    walkingDist: walking?.distKm ?? null,
    cyclingDist: cycling?.distKm ?? null,
    straightDist,
    googleMapsUrl,
  };

  cache.set(apartmentId, result);
  return result;
}
