import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Fetch the expose page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: response.status });
    }

    const html = await response.text();
    const images: string[] = [];

    // Strategy 1: og:image meta tag
    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogMatch) images.push(ogMatch[1]);

    // Strategy 2: ImmobilienScout24 picture URLs from page source
    const picRegex = /https:\/\/pictures\.immobilienscout24\.de\/listings\/[^\s"'<>)]+\.(?:jpg|jpeg|png|webp)/gi;
    const picMatches = html.match(picRegex) || [];
    for (const pic of picMatches) {
      if (!images.includes(pic)) images.push(pic);
    }

    // Strategy 3: Any other image CDN URLs from IS24
    const cdnRegex = /https:\/\/[^"'\s<>]*immobilienscout24[^"'\s<>]*\.(?:jpg|jpeg|png|webp)/gi;
    const cdnMatches = html.match(cdnRegex) || [];
    for (const pic of cdnMatches) {
      if (!images.includes(pic)) images.push(pic);
    }

    // Deduplicate
    const unique = [...new Set(images)];

    return NextResponse.json({
      thumbnail: unique[0] || null,
      gallery: unique.slice(1),
      total: unique.length,
    });
  } catch {
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}
