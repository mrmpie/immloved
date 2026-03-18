import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';

interface ScrapedDetails {
  title?: string;
  address?: string;
  price?: number;
  rooms?: number;
  area?: number;
  floor?: string;
  available_from?: string;
  deposit?: string;
  type?: string;
  year_built?: string;
  condition?: string;
  heating?: string;
  energy_consumption?: string;
  energy_cert?: string;
  energy_sources?: string;
  parking?: string;
  elevator?: string;
  listed_building?: string;
  description?: string;
  equipment?: string;
  location_description?: string;
  contact_name?: string;
  contact_company?: string;
  contact_phone?: string;
  thumbnail_url?: string;
  other_urls?: string;
  unavailable?: boolean;
}

function parseNumber(text: string): number | null {
  // Remove currency symbols, units, and thousand separators: "249.000 €" -> 249000
  const cleaned = text
    .replace(/[€$£²m²]/g, '')
    .replace(/\s/g, '')
    .trim();
  // German format: 249.000,50 -> 249000.50
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Already decimal format: 249000.50
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  // Try extracting first number
  const m = cleaned.match(/[\d.,]+/);
  if (m) {
    const num = m[0].replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(num);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractDetails(html: string): ScrapedDetails {
  const details: ScrapedDetails = {};

  // Check if the listing is unavailable / deactivated
  const unavailablePatterns = [
    /Dieses\s+Angebot\s+ist\s+(?:derzeit\s+)?(?:nicht\s+mehr\s+)?(?:deaktiviert|verfügbar|online)/i,
    /Diese\s+Anzeige\s+ist\s+leider\s+nicht\s+mehr\s+aktuell/i,
    /Angebot\s+wurde\s+deaktiviert/i,
    /Objekt\s+ist\s+nicht\s+mehr\s+verfügbar/i,
    /expose.*?not.*?found/i,
    /Page\s+not\s+found/i,
    /<title>[^<]*(?:404|nicht gefunden|not found|Objekt nicht gefunden)[^<]*<\/title>/i,
    /Diese Immobilie wurde deaktiviert/i,
    /Dieses Inserat ist nicht mehr verf/i,
  ];
  for (const pat of unavailablePatterns) {
    if (pat.test(html)) {
      details.unavailable = true;
      return details;
    }
  }

  // Title - from og:title or h1#expose-title
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitle) {
    details.title = decodeHtmlEntities(ogTitle[1]);
  }
  if (!details.title) {
    const h1Match = html.match(/<h1[^>]*id=["']expose-title["'][^>]*>([^<]+)<\/h1>/i);
    if (h1Match) details.title = decodeHtmlEntities(h1Match[1].trim());
  }

  // Address
  const addressPatterns = [
    /<span[^>]*class=["'][^"']*block[^"']*["'][^>]*>([^<]+)<\/span>\s*<span[^>]*class=["'][^"']*block[^"']*["'][^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class=["'][^"']*address-block[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*data-qa=["']expose-address["'][^>]*>([^<]+)<\/span>/i,
  ];
  for (const pat of addressPatterns) {
    const m = html.match(pat);
    if (m) {
      if (m[2]) {
        details.address = decodeHtmlEntities(`${m[1].trim()}, ${m[2].trim()}`);
      } else {
        details.address = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }
      break;
    }
  }

  // Key-value pairs from criteria groups using dd/dt patterns
  // IS24 uses pattern: <dt class="...">Label</dt><dd class="...">Value</dd>
  const dtDdRegex = /<dt[^>]*>\s*([\s\S]*?)\s*<\/dt>\s*<dd[^>]*>\s*([\s\S]*?)\s*<\/dd>/gi;
  let match;
  while ((match = dtDdRegex.exec(html)) !== null) {
    const rawLabel = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const rawValue = match[2].replace(/<[^>]+>/g, '').trim();
    if (!rawValue || rawValue === '-') continue;

    if ((rawLabel.includes('kaufpreis') || rawLabel.includes('kaltmiete') || rawLabel.includes('preis')) && !details.price) {
      const p = parseNumber(rawValue);
      if (p) details.price = p;
    } else if ((rawLabel.includes('zimmer') || rawLabel.includes('rooms')) && !details.rooms) {
      const r = parseNumber(rawValue);
      if (r) details.rooms = r;
    } else if ((rawLabel.includes('fläche') || rawLabel.includes('wohnfläche') || rawLabel.includes('area')) && !details.area) {
      const a = parseNumber(rawValue);
      if (a) details.area = a;
    } else if ((rawLabel.includes('etage') || rawLabel.includes('floor')) && !details.floor) {
      details.floor = rawValue;
    } else if ((rawLabel.includes('bezugsfrei') || rawLabel.includes('verfügbar') || rawLabel.includes('bezug')) && !details.available_from) {
      details.available_from = rawValue;
    } else if (rawLabel.includes('kaution') && !details.deposit) {
      details.deposit = rawValue;
    } else if ((rawLabel.includes('typ') || rawLabel.includes('type') || rawLabel.includes('immobilienart')) && !details.type) {
      details.type = rawValue;
    } else if (rawLabel.includes('baujahr') && !details.year_built) {
      details.year_built = rawValue;
    } else if (rawLabel.includes('zustand') && !details.condition) {
      details.condition = rawValue;
    } else if (rawLabel.includes('heizung') && !details.heating) {
      details.heating = rawValue;
    } else if ((rawLabel.includes('energieausweis') || rawLabel.includes('energieeffizienz')) && !details.energy_cert) {
      details.energy_cert = rawValue;
    } else if (rawLabel.includes('endenergiebedarf') || rawLabel.includes('energieverbrauch')) {
      if (!details.energy_consumption) details.energy_consumption = rawValue;
    } else if (rawLabel.includes('energieträger') || rawLabel.includes('wesentliche energieträger')) {
      if (!details.energy_sources) details.energy_sources = rawValue;
    } else if ((rawLabel.includes('stellplatz') || rawLabel.includes('garage') || rawLabel.includes('parking')) && !details.parking) {
      details.parking = rawValue;
    } else if (rawLabel.includes('aufzug') || rawLabel.includes('fahrstuhl') || rawLabel.includes('elevator')) {
      if (!details.elevator) details.elevator = rawValue;
    } else if (rawLabel.includes('denkmal') || rawLabel.includes('listed')) {
      if (!details.listed_building) details.listed_building = rawValue;
    }
  }

  // Also try data-qa selectors for values that may use a different HTML structure
  const qaPatterns: [RegExp, keyof ScrapedDetails][] = [
    [/data-qa=["']kaufpreis["'][^>]*>([^<]+)/i, 'price'],
    [/data-qa=["']kaltmiete["'][^>]*>([^<]+)/i, 'price'],
    [/data-qa=["']zimmer["'][^>]*>([^<]+)/i, 'rooms'],
    [/data-qa=["']wohnflaeche["'][^>]*>([^<]+)/i, 'area'],
    [/data-qa=["']etage["'][^>]*>([^<]+)/i, 'floor'],
    [/data-qa=["']baujahr["'][^>]*>([^<]+)/i, 'year_built'],
    [/data-qa=["']zustand["'][^>]*>([^<]+)/i, 'condition'],
    [/data-qa=["']heizungsart["'][^>]*>([^<]+)/i, 'heating'],
  ];
  for (const [regex, key] of qaPatterns) {
    if (!details[key]) {
      const m = html.match(regex);
      if (m) {
        const val = m[1].trim();
        if (key === 'price') {
          const p = parseNumber(val);
          if (p) details.price = p;
        } else if (key === 'rooms') {
          const r = parseNumber(val);
          if (r) details.rooms = r;
        } else if (key === 'area') {
          const a = parseNumber(val);
          if (a) details.area = a;
        } else {
          (details as Record<string, unknown>)[key] = val;
        }
      }
    }
  }

  // Description sections
  const sectionPatterns: [RegExp, keyof ScrapedDetails][] = [
    [/class=["'][^"']*is24qa-objektbeschreibung[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'description'],
    [/class=["'][^"']*is24qa-ausstattung[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'equipment'],
    [/class=["'][^"']*is24qa-lage[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'location_description'],
    [/data-qa=["']objektbeschreibung["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'description'],
    [/data-qa=["']ausstattung["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'equipment'],
    [/data-qa=["']lage["'][^>]*>([\s\S]*?)<\/(?:div|p|pre)/i, 'location_description'],
  ];
  for (const [regex, key] of sectionPatterns) {
    if (!details[key]) {
      const m = html.match(regex);
      if (m) {
        const text = m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 5) {
          (details as Record<string, unknown>)[key] = text;
        }
      }
    }
  }

  // Contact info
  const contactPatterns = [
    /class=["'][^"']*contactData[^"']*["'][^>]*>([\s\S]*?)<\/div/i,
    /data-qa=["']contactName["'][^>]*>([^<]+)/i,
    /class=["'][^"']*is24qa-makler-name[^"']*["'][^>]*>([^<]+)/i,
  ];
  for (const pat of contactPatterns) {
    if (!details.contact_name) {
      const m = html.match(pat);
      if (m) details.contact_name = m[1].replace(/<[^>]+>/g, '').trim();
    }
  }

  const companyPatterns = [
    /data-qa=["']companyName["'][^>]*>([^<]+)/i,
    /class=["'][^"']*is24qa-firma[^"']*["'][^>]*>([^<]+)/i,
  ];
  for (const pat of companyPatterns) {
    if (!details.contact_company) {
      const m = html.match(pat);
      if (m) details.contact_company = m[1].trim();
    }
  }

  // Images
  const images: string[] = [];

  // og:image
  const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImg && ogImg[1].startsWith('http')) images.push(ogImg[1]);

  // IS24 picture CDN
  const picRegex = /https:\/\/pictures\.immobilienscout24\.de\/listings\/[^\s"'<>)]+\.(?:jpg|jpeg|png|webp)/gi;
  const picMatches = html.match(picRegex) || [];
  for (const pic of picMatches) {
    if (!images.includes(pic)) images.push(pic);
  }

  // Any IS24 CDN images
  const cdnRegex = /https:\/\/[^"'\s<>]*immobilienscout24[^"'\s<>]*\.(?:jpg|jpeg|png|webp)/gi;
  const cdnMatches = html.match(cdnRegex) || [];
  for (const pic of cdnMatches) {
    if (!images.includes(pic)) images.push(pic);
  }

  if (images.length > 0) {
    details.thumbnail_url = images[0];
    if (images.length > 1) {
      details.other_urls = JSON.stringify(images.slice(1));
    }
  }

  return details;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
}

// Reuse a single browser instance across requests to avoid repeated cold starts
let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
let tempProfileDir: string | null = null;

function copyProfileCookies(): string {
  // Create a temp profile dir with cookies copied from the real chrome_profile
  const tmp = path.join(os.tmpdir(), 'immloved_chrome_' + Date.now());
  const srcProfile = path.resolve(process.cwd(), '..', 'chrome_profile');
  const srcDefault = path.join(srcProfile, 'Default');

  fs.mkdirSync(path.join(tmp, 'Default'), { recursive: true });

  // Copy cookie files and local state
  const filesToCopy = ['Cookies', 'Cookies-journal', 'Login Data', 'Web Data', 'Preferences'];
  for (const file of filesToCopy) {
    const src = path.join(srcDefault, file);
    if (fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, path.join(tmp, 'Default', file));
      } catch { /* skip locked files */ }
    }
  }

  // Copy Local State
  const localState = path.join(srcProfile, 'Local State');
  if (fs.existsSync(localState)) {
    try {
      fs.copyFileSync(localState, path.join(tmp, 'Local State'));
    } catch { /* skip */ }
  }

  return tmp;
}

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // Copy cookies from the real Chrome profile into a temp dir
  tempProfileDir = copyProfileCookies();

  browserInstance = await puppeteer.launch({
    headless: false,
    userDataDir: tempProfileDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--lang=de-DE',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
      '--window-position=2000,2000',
    ],
  });
  return browserInstance;
}

export async function POST(request: NextRequest) {
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>['newPage']>> | null = null;
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    // Set a realistic viewport and language
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' });

    // Stealth: hide webdriver property and mimic a real browser
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['de-DE', 'de', 'en'] });
      (window.navigator as unknown as Record<string, unknown>).chrome = { runtime: {} };
    });

    // Navigate to the expose page
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const status = response?.status() ?? 0;
    if (status === 404 || status === 410) {
      await page.close();
      return NextResponse.json({ unavailable: true, details: {} });
    }

    // Wait a moment for JS to render content
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // Try to dismiss cookie banner
    try {
      const cookieBtn = await page.$('#uc-btn-accept-banner, [data-testid="uc-accept-all-button"]');
      if (cookieBtn) {
        await cookieBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch { /* no cookie banner */ }

    // Get the fully rendered HTML
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    await page.close();
    page = null;

    if (!html || html.length < 500) {
      return NextResponse.json({ error: 'Empty page', unavailable: true, details: {} });
    }

    // Check if we got a bot challenge page (very small HTML with captcha as the main content)
    const isBotChallenge = html.length < 10000 && /Ich bin kein Roboter/i.test(html);
    if (isBotChallenge) {
      return NextResponse.json({
        error: 'Bot challenge detected',
        botBlocked: true,
        unavailable: false,
        details: {},
      });
    }

    const details = extractDetails(html);

    if (details.unavailable) {
      return NextResponse.json({ unavailable: true, details: {} });
    }

    return NextResponse.json({ unavailable: false, details });
  } catch (err) {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
    return NextResponse.json({ error: 'Scrape failed: ' + (err instanceof Error ? err.message : 'unknown') }, { status: 500 });
  }
}
