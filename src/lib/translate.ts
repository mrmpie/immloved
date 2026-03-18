/**
 * Translate German text to English using Google Translate's unofficial API.
 * Handles chunking for long texts (~4500 char limit per request).
 * Falls back to MyMemory if Google fails.
 * Returns null on failure.
 */

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const CHUNK_SIZE = 4500;

async function translateChunkGoogle(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'de',
      tl: 'en',
      dt: 't',
      q: text,
    });
    const res = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Response is [[["translated","original",...],...],...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((s: string[]) => s[0]).join('');
    }
    return null;
  } catch {
    return null;
  }
}

async function translateChunkMyMemory(text: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=de|en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data.responseData?.translatedText;
    if (translated && !translated.includes('MYMEMORY WARNING')) return translated;
    return null;
  } catch {
    return null;
  }
}

async function translateChunk(text: string): Promise<string | null> {
  // Try Google first, fall back to MyMemory
  const google = await translateChunkGoogle(text);
  if (google) return google;
  return translateChunkMyMemory(text);
}

/**
 * Split text into chunks at sentence boundaries, respecting CHUNK_SIZE.
 */
function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }

    // Find the last sentence-ending punctuation within CHUNK_SIZE
    let splitAt = -1;
    for (let i = CHUNK_SIZE; i >= CHUNK_SIZE / 2; i--) {
      if (remaining[i] === '.' || remaining[i] === '!' || remaining[i] === '?' || remaining[i] === '\n') {
        splitAt = i + 1;
        break;
      }
    }
    // Fallback: split at last space
    if (splitAt === -1) {
      for (let i = CHUNK_SIZE; i >= CHUNK_SIZE / 2; i--) {
        if (remaining[i] === ' ') {
          splitAt = i + 1;
          break;
        }
      }
    }
    // Last resort: hard split
    if (splitAt === -1) splitAt = CHUNK_SIZE;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}

/**
 * Translate a potentially long German text to English.
 * Splits into chunks, translates each, and joins them.
 * Rate-limits between chunks.
 */
export async function translateText(text: string): Promise<string | null> {
  if (!text || text.trim().length === 0) return null;

  const chunks = splitIntoChunks(text.trim());
  const translated: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
    const result = await translateChunk(chunks[i]);
    if (!result) return null; // Abort if any chunk fails
    translated.push(result);
  }

  return translated.join(' ');
}

/** The translatable field pairs: [source German field, target English field] */
export const TRANSLATABLE_FIELDS: [string, string][] = [
  ['title', 'title_en'],
  ['description', 'description_en'],
  ['equipment', 'equipment_en'],
  ['location_description', 'location_description_en'],
  ['condition', 'condition_en'],
];
