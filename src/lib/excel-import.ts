import * as XLSX from 'xlsx';
import { ApartmentInsert } from './types';
import { parseNumber, extractImmoscoutId } from './utils';

interface RawRow {
  [key: string]: string | number | null | undefined;
}

function getString(row: RawRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = row[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return null;
}

function getNumber(row: RawRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = row[key];
    if (val != null) {
      const num = parseNumber(val);
      if (num != null) return num;
    }
  }
  return null;
}

function parseVisitDate(val: string | number | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'não' || s.toLowerCase() === 'no') return null;
  // Try to parse as date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

export function parseVisitadosSheet(data: ArrayBuffer): ApartmentInsert[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });

  // Try to find the Visitados sheet
  const sheetName = wb.SheetNames.find(
    (n) =>
      n.toLowerCase().includes('visitados') ||
      n.toLowerCase().includes('grupos')
  ) || wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const apartments: ApartmentInsert[] = [];

  for (const row of rows) {
    const url = getString(row,
      'URL ImmoScout',
      'URL ImmoScout (pode incluir casas visitadas, organizado por €/m2)',
      'URL',
      'url'
    );
    if (!url) continue;

    const immoscoutId = extractImmoscoutId(url);
    const visitDateRaw = row['Visita feita?'] ?? row['Visit Date'];
    const visitDate = parseVisitDate(visitDateRaw);
    const visited = visitDate != null;

    const apt: ApartmentInsert = {
      immoscout_id: immoscoutId,
      url,
      title: getString(row, 'Title', 'Título'),
      title_en: null,
      address: getString(row, 'Address', 'Endereço'),
      latitude: null,
      longitude: null,
      price: getNumber(row, 'Price (€)', 'Price', 'Kaufpreis', 'Price (Kaltmiete)'),
      area: getNumber(row, 'Living Area (m²)', 'Living Area (sqm)', 'Area', 'Wohnfläche ca.'),
      rooms: getNumber(row, '# Rooms', 'Rooms', 'Zimmer'),
      bedrooms: getNumber(row, '# Bedrooms', 'Bedrooms', 'Schlafzimmer') as number | null,
      bathrooms: getNumber(row, '# Bathrooms', 'Bathrooms', 'Badezimmer') as number | null,
      floor: getString(row, 'Floor', 'Etage'),
      floor_en: null,
      available_from: getString(row, 'Available from', 'Bezugsfrei ab'),
      available_from_en: null,
      type: getString(row, 'Type', 'Typ'),
      type_en: null,
      year_built: getString(row, 'Year Built', 'Baujahr'),
      year_built_en: null,
      condition: getString(row, 'Condition', 'Objektzustand'),
      condition_en: null,
      heating: getString(row, 'Heating', 'Heizungsart'),
      heating_en: null,
      energy_sources: getString(row, 'Key energy sources', 'Energieträger'),
      energy_sources_en: null,
      energy_consumption: getString(row, 'Final energy consumption', 'Endenergieverbrauch'),
      energy_consumption_en: null,
      energy_cert: getString(row, 'Energy Certificate', 'Energieausweis'),
      energy_cert_en: null,
      parking: getString(row, 'Parking', 'Stellplatz'),
      parking_en: null,
      elevator: getString(row, 'Elevator', 'Aufzug'),
      elevator_en: null,
      listed_building: getString(row, 'Listed building', 'Denkmalschutz'),
      listed_building_en: null,
      renovation: getString(row, 'Modernization/Renovation', 'Modernisierung/ Sanierung'),
      renovation_en: null,
      rented: getString(row, 'Rented'),
      rented_en: null,
      rental_income: getString(row, 'Monthly rental income'),
      rental_income_en: null,
      deposit: getString(row, 'Deposit', 'Kaution'),
      deposit_en: null,
      district: getString(row, 'District', 'Grupo'),
      district_en: null,
      description: getString(row, 'Description', 'Objektbeschreibung'),
      description_en: null,
      equipment: getString(row, 'Equipment', 'Ausstattung'),
      equipment_en: null,
      location_description: getString(row, 'Location Description', 'Location', 'Lage'),
      location_description_en: null,
      contact_name: getString(row, 'Contact Name'),
      contact_company: getString(row, 'Contact Company'),
      contact_phone: getString(row, 'Contact Phone'),
      contact_email: getString(row, 'Email'),
      company_website: getString(row, 'Company Website'),
      thumbnail_url: getString(row, 'Thumbnail URL', 'thumbnail_url', 'Thumbnail'),
      other_urls: getString(row, "Other URL's", 'other_urls', 'Other URLs', 'Gallery URLs'),
      is_favorite: true,
      is_removed: false,
      user1_favorite: false,
      user2_favorite: false,
      user1_comment: null,
      user2_comment: null,
      user1_visited: visited,
      user1_visit_date: visitDate,
      user2_visited: false,
      user2_visit_date: null,
      preference_rating: null,
      rank_order: null,
      would_buy: getString(row, 'Compraria?'),
      would_buy_en: null,
      pros: getString(row, 'Pontos a Favor'),
      pros_en: null,
      cons: getString(row, 'Pontos Contra'),
      cons_en: null,
      zone_rating: getString(row, 'Classificação da zona como investimento (segundo ChatGPT)'),
      zone_rating_en: null,
    };

    apartments.push(apt);
  }

  return apartments;
}
