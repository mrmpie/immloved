import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET: Returns apartments that have a title but no title_en (or other missing _en fields).
 * POST: Translates missing _en fields for all apartments using Google Translate.
 */

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

async function translateText(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: 'gtx', sl: 'de', tl: 'en', dt: 't', q: text,
    });
    const res = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((s: string[]) => s[0]).join('');
    }
    return null;
  } catch {
    return null;
  }
}

const FIELDS: [string, string][] = [
  ['title', 'title_en'],
  ['description', 'description_en'],
  ['equipment', 'equipment_en'],
  ['location_description', 'location_description_en'],
  ['condition', 'condition_en'],
];

function isEmpty(val: unknown): boolean {
  if (val == null) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
}

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: 'Supabase not configured — this audit only works with Supabase' }, { status: 400 });
  }

  const { data: apartments, error } = await supabase
    .from('apartments')
    .select('id, immoscout_id, title, title_en, description, description_en, equipment, equipment_en, location_description, location_description_en, condition, condition_en, is_removed')
    .eq('is_removed', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const missing: { id: string; immoscout_id: string | null; title: string | null; missingFields: string[] }[] = [];

  for (const apt of apartments || []) {
    const missingFields: string[] = [];
    for (const [src, tgt] of FIELDS) {
      const rec = apt as Record<string, unknown>;
      if (!isEmpty(rec[src]) && isEmpty(rec[tgt])) {
        missingFields.push(tgt);
      }
    }
    if (missingFields.length > 0) {
      missing.push({
        id: apt.id,
        immoscout_id: apt.immoscout_id,
        title: apt.title,
        missingFields,
      });
    }
  }

  return NextResponse.json({
    totalApartments: apartments?.length || 0,
    needingTranslation: missing.length,
    apartments: missing,
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const onlyField: string | undefined = body.field; // optional: only translate a specific field like "title_en"

  const { data: apartments, error } = await supabase
    .from('apartments')
    .select('id, immoscout_id, title, title_en, description, description_en, equipment, equipment_en, location_description, location_description_en, condition, condition_en, is_removed')
    .eq('is_removed', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let translated = 0;
  let failed = 0;
  const results: { id: string; title: string | null; status: string; fields: string[] }[] = [];

  for (const apt of apartments || []) {
    const updates: Record<string, string> = {};
    const translatedFields: string[] = [];

    for (const [src, tgt] of FIELDS) {
      const rec = apt as Record<string, unknown>;
      if (onlyField && tgt !== onlyField) continue;
      if (!isEmpty(rec[src]) && isEmpty(rec[tgt])) {
        const result = await translateText(rec[src] as string);
        if (result) {
          updates[tgt] = result;
          translatedFields.push(tgt);
        }
        // Rate limit
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', apt.id);

      if (updateError) {
        failed++;
        results.push({ id: apt.id, title: apt.title, status: 'error: ' + updateError.message, fields: [] });
      } else {
        translated++;
        results.push({ id: apt.id, title: apt.title, status: 'translated', fields: translatedFields });
      }
    }
  }

  return NextResponse.json({
    translated,
    failed,
    results,
  });
}
