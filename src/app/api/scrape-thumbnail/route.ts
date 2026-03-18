import { NextRequest, NextResponse } from 'next/server';

// Extract expose ID from URL
function extractExposeId(url: string): string | null {
  const m = url.match(/\/expose\/(\d+)/);
  return m ? m[1] : null;
}

// Normalize IS24 image URL to get base image identifier
// IS24 serves same image in multiple sizes: /listings/123-0.jpg/ORIG/resize/800x600/...
// We want to dedupe these to just the unique base images
function normalizeImageUrl(url: string): string {
  // Extract the base image path before size/transformation parameters
  // Example: https://pictures.immobilienscout24.de/listings/123-0.jpg/ORIG/resize/800x600/... 
  // -> listings/123-0.jpg
  const match = url.match(/listings\/(\d+-\d+\.(?:jpg|jpeg|png|webp))/i);
  return match ? match[1] : url;
}

// Try multiple strategies to get images for an IS24 expose
async function fetchImages(url: string): Promise<string[]> {
  const images: string[] = [];
  const seenBaseImages = new Set<string>();
  const exposeId = extractExposeId(url);

  // Helper to add image only if we haven't seen this base image before
  const addImage = (imageUrl: string) => {
    const normalized = normalizeImageUrl(imageUrl);
    if (!seenBaseImages.has(normalized)) {
      seenBaseImages.add(normalized);
      images.push(imageUrl);
    }
  };

  // Strategy 1: Googlebot UA (IS24 must serve content to search engines)
  const userAgents = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uagroup.php)',
  ];

  for (const ua of userAgents) {
    if (images.length > 0) break;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) continue;

      const html = await response.text();

      // og:image meta tag (usually the main/best image)
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1].startsWith('http')) addImage(ogMatch[1]);

      // twitter:image meta tag
      const twMatch = html.match(/<meta\s+(?:name|property)=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      if (twMatch && twMatch[1].startsWith('http')) addImage(twMatch[1]);

      // Only extract images that match the expose ID to avoid getting recommendation/similar listing images
      if (exposeId) {
        // IS24 image URLs for THIS specific expose only
        // Format: https://pictures.immobilienscout24.de/listings/{exposeId}-{index}.jpg
        const exposeSpecificRegex = new RegExp(
          `https://pictures\\.immobilienscout24\\.de/listings/${exposeId}-(\\d+)\\.(?:jpg|jpeg|png|webp)(?:/ORIG)?[^\\s"'<>)]*`,
          'gi'
        );
        const picMatches = html.match(exposeSpecificRegex) || [];
        
        // Sort to prefer ORIG quality images
        const sortedPics = picMatches.sort((a, b) => {
          const aHasOrig = a.includes('/ORIG');
          const bHasOrig = b.includes('/ORIG');
          if (aHasOrig && !bHasOrig) return -1;
          if (!aHasOrig && bHasOrig) return 1;
          return 0;
        });
        
        for (const pic of sortedPics) {
          addImage(pic);
        }
      }
    } catch { /* try next UA */ }
  }

  // Strategy 2: Try IS24 search result API (returns JSON with thumbnails)
  if (images.length === 0 && exposeId) {
    try {
      const apiUrl = `https://www.immobilienscout24.de/expose/${exposeId}`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const text = await response.text();
        // Only match images for THIS specific expose ID
        const jsonPicRegex = new RegExp(
          `https://pictures\\.immobilienscout24\\.de/listings/${exposeId}-(\\d+)\\.(?:jpg|jpeg|png|webp)[^"'\\s\\\\]*`,
          'gi'
        );
        const jsonPics = text.match(jsonPicRegex) || [];
        for (const pic of jsonPics) {
          const clean = pic.replace(/\\u002F/g, '/').replace(/\\/g, '');
          addImage(clean);
        }
      }
    } catch { /* skip */ }
  }

  // Strategy 3: Try constructing thumbnail URL from expose ID pattern
  if (images.length === 0 && exposeId) {
    try {
      const testUrl = `https://pictures.immobilienscout24.de/listings/${exposeId}-0.jpg/ORIG/legacy_thumbnail/${exposeId}-0.jpg`;
      const response = await fetch(testUrl, { method: 'HEAD' });
      if (response.ok) addImage(testUrl);
    } catch { /* skip */ }
  }

  // Limit to max 10 unique images to avoid overwhelming the gallery
  return images.slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const images = await fetchImages(url);

    return NextResponse.json({
      thumbnail: images[0] || null,
      gallery: images.slice(1),
      total: images.length,
    });
  } catch {
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}
