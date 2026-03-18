import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.immobilienscout24.de/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
