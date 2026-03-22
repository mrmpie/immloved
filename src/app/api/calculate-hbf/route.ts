import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LEIPZIG_HBF = { lat: 51.3455, lng: 12.3828 };

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
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) return null;
    
    const reader = res.body?.getReader();
    if (!reader) return null;
    
    let text = '';
    const maxSize = 100 * 1024;
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
      
      const speedKmh = profile === 'foot' ? 5 : 15;
      const minutes = Math.round((distKm / speedKmh) * 60);
      
      return {
        minutes,
        distKm: Math.round(distKm * 10) / 10,
      };
    }
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(`OSRM route timeout for ${profile}`);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apartmentId, latitude, longitude, address } = await request.json();

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'Missing required field: apartmentId' },
        { status: 400 }
      );
    }

    let lat = latitude;
    let lng = longitude;

    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) {
      if (!address) {
        return NextResponse.json(
          { error: 'Missing coordinates and no address provided for geocoding' },
          { status: 400 }
        );
      }

      const { geocodeAddress } = await import('@/lib/geocode');
      const coords = await geocodeAddress(address);
      
      if (!coords) {
        return NextResponse.json(
          { error: 'Failed to geocode address' },
          { status: 400 }
        );
      }

      lat = coords.lat;
      lng = coords.lng;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('apartments')
          .update({ latitude: lat, longitude: lng })
          .eq('id', apartmentId);
      }
    }

    const straightDist = Math.round(haversineKm(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng) * 10) / 10;
    const transitEstimate = Math.round(straightDist * 3 + 5);

    const [walking, cycling] = await Promise.all([
      osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'foot'),
      osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'bike'),
    ]);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('apartments')
      .update({
        hbf_walk_time: walking?.minutes ?? null,
        hbf_walk_dist: walking?.distKm ?? null,
        hbf_bike_time: cycling?.minutes ?? null,
        hbf_bike_dist: cycling?.distKm ?? null,
        hbf_transit_time: transitEstimate,
        hbf_straight_dist: straightDist,
        hbf_calculated_at: new Date().toISOString(),
      })
      .eq('id', apartmentId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update apartment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
        hbf_walk_time: walking?.minutes ?? null,
        hbf_walk_dist: walking?.distKm ?? null,
        hbf_bike_time: cycling?.minutes ?? null,
        hbf_bike_dist: cycling?.distKm ?? null,
        hbf_transit_time: transitEstimate,
        hbf_straight_dist: straightDist,
      },
    });
  } catch (error) {
    console.error('Calculate Hbf error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
