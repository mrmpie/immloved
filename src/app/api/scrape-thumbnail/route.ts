import { NextRequest, NextResponse } from 'next/server';

// Extract expose ID from URL
function extractExposeId(url: string): string | null {
  const m = url.match(/\/expose\/(\d+)/);
  return m ? m[1] : null;
}

// Try multiple strategies to get images for an IS24 expose
async function fetchImages(url: string): Promise<string[]> {
  const images: string[] = [];
  const exposeId = extractExposeId(url);

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

      // og:image meta tag
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1].startsWith('http')) images.push(ogMatch[1]);

      // twitter:image meta tag
      const twMatch = html.match(/<meta\s+(?:name|property)=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      if (twMatch && twMatch[1].startsWith('http') && !images.includes(twMatch[1])) images.push(twMatch[1]);

      // IS24 picture CDN URLs from page source
      const picRegex = /https:\/\/pictures\.immobilienscout24\.de\/listings\/[^\s"'<>)]+\.(?:jpg|jpeg|png|webp)/gi;
      const picMatches = html.match(picRegex) || [];
      for (const pic of picMatches) {
        if (!images.includes(pic)) images.push(pic);
      }

      // Any IS24 CDN image URLs
      const cdnRegex = /https:\/\/[^"'\s<>]*immobilienscout24[^"'\s<>]*\.(?:jpg|jpeg|png|webp)/gi;
      const cdnMatches = html.match(cdnRegex) || [];
      for (const pic of cdnMatches) {
        if (!images.includes(pic)) images.push(pic);
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
        // Try to extract image URLs from JSON response
        const jsonPicRegex = /https:\/\/pictures\.immobilienscout24\.de[^"'\s\\]+/gi;
        const jsonPics = text.match(jsonPicRegex) || [];
        for (const pic of jsonPics) {
          const clean = pic.replace(/\\u002F/g, '/').replace(/\\/g, '');
          if (!images.includes(clean)) images.push(clean);
        }
      }
    } catch { /* skip */ }
  }

  // Strategy 3: Try constructing thumbnail URL from expose ID pattern
  if (images.length === 0 && exposeId) {
    try {
      // IS24 often has thumbnails at a predictable path - test if it exists
      const testUrl = `https://pictures.immobilienscout24.de/listings/${exposeId}-0.jpg/ORIG/legacy_thumbnail/${exposeId}-0.jpg`;
      const response = await fetch(testUrl, { method: 'HEAD' });
      if (response.ok) images.push(testUrl);
    } catch { /* skip */ }
  }

  return [...new Set(images)];
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
