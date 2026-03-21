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
        // Limit response size to prevent memory issues
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) continue;

      // Stream text with size limit to prevent memory exhaustion
      const reader = response.body?.getReader();
      if (!reader) continue;
      
      let html = '';
      const maxSize = 2 * 1024 * 1024; // 2MB limit
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        html += chunk;
        
        // Stop if we exceed size limit
        if (html.length > maxSize) {
          reader.cancel();
          break;
        }
      }

      // Only process meta tags for main image (faster than full regex)
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1].startsWith('http')) addImage(ogMatch[1]);

      const twMatch = html.match(/<meta\s+(?:name|property)=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      if (twMatch && twMatch[1].startsWith('http')) addImage(twMatch[1]);

      // Only extract images that match the expose ID (limited scope)
      if (exposeId && images.length < 5) {
        const exposeSpecificRegex = new RegExp(
          `https://pictures\.immobilienscout24\.de/listings/${exposeId}-(\\d+)\\.(?:jpg|jpeg|png|webp)(?:/ORIG)?[^\\s"'<>)]*`,
          'gi'
        );
        
        // Use exec instead of match for better memory efficiency
        let match;
        const picMatches = [];
        while ((match = exposeSpecificRegex.exec(html)) !== null && picMatches.length < 10) {
          picMatches.push(match[0]);
        }
        
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
      
      // Clean up
      reader.releaseLock();
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
        signal: AbortSignal.timeout(5000), // 5s timeout for API
      });
      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          let text = '';
          const maxSize = 512 * 1024; // 512KB limit for JSON
          const decoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            text += chunk;
            
            if (text.length > maxSize) {
              reader.cancel();
              break;
            }
          }
          
          // Only match images for THIS specific expose ID (limited scope)
          const jsonPicRegex = new RegExp(
            `https://pictures\.immobilienscout24\.de/listings/${exposeId}-(\\d+)\\.(?:jpg|jpeg|png|webp)[^"'\\s\\\\]*`,
            'gi'
          );
          
          let match;
          while ((match = jsonPicRegex.exec(text)) !== null && images.length < 5) {
            const clean = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
            addImage(clean);
          }
          
          reader.releaseLock();
        }
      }
    } catch { /* skip */ }
  }

  // Strategy 3: Try constructing thumbnail URL from expose ID pattern
  if (images.length === 0 && exposeId) {
    try {
      const testUrl = `https://pictures.immobilienscout24.de/listings/${exposeId}-0.jpg/ORIG/legacy_thumbnail/${exposeId}-0.jpg`;
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
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
