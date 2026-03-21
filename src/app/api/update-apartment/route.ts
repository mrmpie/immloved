import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';

interface TranslationResult {
  original: string;
  translated: string | null;
}

// Simple translation function using common German real estate terms
// In production, you might want to integrate with a translation API
async function translateText(text: string | null | undefined): Promise<string | null> {
  if (!text || !text.trim()) return null;
  
  // Common real estate term translations
  const translations: Record<string, string> = {
    // Room types
    'zimmer': 'room',
    'zimmer': 'rooms',
    'schlafzimmer': 'bedroom',
    'schlafzimmer': 'bedrooms',
    'badezimmer': 'bathroom',
    'badezimmer': 'bathrooms',
    'küche': 'kitchen',
    'wohnzimmer': 'living room',
    'bad': 'bath',
    
    // Building types
    'wohnung': 'apartment',
    'haus': 'house',
    'etagenwohnung': 'apartment',
    'dachgeschosswohnung': 'penthouse apartment',
    'erdgeschosswohnung': 'ground floor apartment',
    'reihenhaus': 'townhouse',
    'doppelhaushälfte': 'semi-detached house',
    'einfamilienhaus': 'single family house',
    
    // Condition
    'erstbezug': 'first occupancy',
    'gepflegt': 'well-maintained',
    'gut gepflegt': 'well-maintained',
    'modernisiert': 'modernized',
    'renoviert': 'renovated',
    'saniert': 'renovated',
    'neuwertig': 'like new',
    'altbau': 'old building',
    'neubau': 'new construction',
    
    // Heating
    'zentralheizung': 'central heating',
    'gasheizung': 'gas heating',
    'öheizung': 'oil heating',
    'fernheizung': 'district heating',
    'fußbodenheizung': 'underfloor heating',
    
    // Equipment
    'einbauküche': 'fitted kitchen',
    'balkon': 'balcony',
    'terrasse': 'terrace',
    'keller': 'basement',
    'aufzug': 'elevator',
    'fahrstuhl': 'elevator',
    'garage': 'garage',
    'stellplatz': 'parking space',
    'gartennutzung': 'garden use',
    
    // Location
    'erdgeschoss': 'ground floor',
    'obergeschoss': 'upper floor',
    'dachgeschoss': 'attic floor',
    'keller': 'basement',
    
    // Availability
    'sofort': 'immediately',
    'nach vereinbarung': 'by agreement',
    'verfügbar': 'available',
    
    // Common phrases
    'objektbeschreibung': 'description',
    'ausstattung': 'equipment',
    'lage': 'location',
    'sonstiges': 'other',
    
    // Costs
    'kaution': 'deposit',
    'nebenkosten': 'additional costs',
    'heizkosten': 'heating costs',
    'warmmiete': 'warm rent',
    'kaltmiete': 'cold rent',
    'hausgeld': 'service charge',
    
    // Energy
    'energieausweis': 'energy certificate',
    'endenergieverbrauch': 'final energy consumption',
    'energieträger': 'energy source',
  };
  
  let translated = text.toLowerCase();
  
  // Replace known terms
  Object.entries(translations).forEach(([german, english]) => {
    const regex = new RegExp(`\\b${german}\\b`, 'gi');
    translated = translated.replace(regex, english);
  });
  
  // Capitalize first letter and preserve some formatting
  if (translated !== text.toLowerCase()) {
    // Only return translation if something was actually translated
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  
  // Return null if no translation was made (to avoid overwriting with same content)
  return null;
}

async function translateApartmentDetails(details: any): Promise<any> {
  const translated = { ...details };
  
  // Translate key fields
  const textFields = [
    'title', 'description', 'equipment', 'location_description',
    'type', 'condition', 'heating', 'energy_cert', 'energy_sources',
    'energy_consumption', 'parking', 'elevator', 'listed_building',
    'renovation', 'rented', 'deposit', 'available_from', 'floor',
    'year_built', 'agency_fee', 'district'
  ];
  
  for (const field of textFields) {
    if (details[field]) {
      const translatedValue = await translateText(details[field]);
      if (translatedValue) {
        translated[`${field}_en`] = translatedValue;
      }
    }
  }
  
  return translated;
}

export async function POST(request: NextRequest) {
  try {
    const { url, apartmentId } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }
    
    if (!apartmentId || typeof apartmentId !== 'string') {
      return NextResponse.json({ error: 'Missing apartmentId' }, { status: 400 });
    }
    
    // Step 1: Scrape apartment details
    const detailsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/scrape-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    if (!detailsResponse.ok) {
      const error = await detailsResponse.json();
      return NextResponse.json({ error: 'Failed to scrape details', details: error }, { status: 500 });
    }
    
    const { unavailable, details } = await detailsResponse.json();
    
    if (unavailable) {
      return NextResponse.json({ error: 'Apartment listing is no longer available' }, { status: 404 });
    }
    
    // Step 2: Scrape images
    const imagesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/scrape-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    let thumbnail_url = null;
    let other_urls = null;
    
    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      thumbnail_url = imagesData.thumbnail;
      if (imagesData.gallery && imagesData.gallery.length > 0) {
        other_urls = JSON.stringify(imagesData.gallery);
      }
    }
    
    // Step 3: Translate details
    const translatedDetails = await translateApartmentDetails({
      ...details,
      thumbnail_url,
      other_urls,
    });
    
    // Step 4: Geocode address if available
    let latitude = null;
    let longitude = null;
    
    if (translatedDetails.address) {
      const coords = await geocodeAddress(translatedDetails.address);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    
    // Step 5: Prepare final update data
    const updateData = {
      ...translatedDetails,
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      updateData,
      message: 'Apartment updated successfully with translated details and images',
    });
    
  } catch (error) {
    console.error('Update apartment error:', error);
    return NextResponse.json({ 
      error: 'Failed to update apartment: ' + (error instanceof Error ? error.message : 'unknown') 
    }, { status: 500 });
  }
}
