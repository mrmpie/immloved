// Geocoding using OpenStreetMap Nominatim (free, no API key needed)
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'Immloved/1.0',
        },
      }
    );
    const data = await res.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      // Validate that we got valid numbers
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  } catch {
    return null;
  }
}
