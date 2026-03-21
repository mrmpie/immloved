// Geocoding using OpenStreetMap Nominatim (free, no API key needed)
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Ensure Leipzig is included in the query if not already present
    let searchAddress = address;
    const lowerAddress = address.toLowerCase();
    if (!lowerAddress.includes('leipzig') && !lowerAddress.includes('germany')) {
      searchAddress = `${address}, Leipzig, Germany`;
    } else if (!lowerAddress.includes('germany')) {
      searchAddress = `${address}, Germany`;
    }
    
    const query = encodeURIComponent(searchAddress);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'Immloved/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5s timeout
      }
    );
    
    if (!res.ok) return null;
    
    // Read response with size limit
    const reader = res.body?.getReader();
    if (!reader) return null;
    
    let text = '';
    const maxSize = 50 * 1024; // 50KB limit
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
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      // Validate that we got valid numbers
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  } catch (error) {
    // Log timeout errors for debugging
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('Geocoding timeout for address:', address);
    }
    return null;
  }
}
