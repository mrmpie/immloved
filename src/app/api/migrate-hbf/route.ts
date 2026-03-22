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

async function calculateHbfForApartment(
  supabase: any,
  id: string,
  lat: number,
  lng: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const straightDist = Math.round(haversineKm(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng) * 10) / 10;
    const transitEstimate = Math.round(straightDist * 3 + 5);

    const [walking, cycling] = await Promise.all([
      osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'foot'),
      osrmRoute(lat, lng, LEIPZIG_HBF.lat, LEIPZIG_HBF.lng, 'bike'),
    ]);

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
      .eq('id', id);

    if (error) {
      console.error(`Error updating apartment ${id}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error calculating Hbf for apartment ${id}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apartments, error: fetchError } = await supabase
      .from('apartments')
      .select('id, latitude, longitude, hbf_calculated_at')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .is('hbf_calculated_at', null);

    if (fetchError) {
      console.error('Error fetching apartments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch apartments' },
        { status: 500 }
      );
    }

    if (!apartments || apartments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No apartments need Hbf calculation',
        processed: 0,
      });
    }

    const results = {
      total: apartments.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const apt of apartments) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await calculateHbfForApartment(
        supabase,
        apt.id,
        apt.latitude,
        apt.longitude
      );

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push(`${apt.id}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${results.successful} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
