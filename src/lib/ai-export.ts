import { Apartment } from './types';

export interface ApartmentSummary {
  title: string;
  address: string;
  district: string;
  price: string;
  area: string;
  pricePerM2: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  type: string;
  yearBuilt: string;
  condition: string;
  heating: string;
  energyConsumption: string;
  energyCert: string;
  kitchen: string;
  elevator: string;
  parking: string;
  hausgeld: string;
  agencyFee: string;
  rented: string;
  deposit: string;
  pros: string;
  cons: string;
  user1Comment: string;
  user2Comment: string;
  wouldBuy: string;
  zoneRating: string;
  preferenceRating: string;
  locationDescription: string;
}

function val(v: string | number | boolean | null | undefined, suffix = ''): string {
  if (v === null || v === undefined || v === '') return 'N/A';
  return `${v}${suffix}`;
}

export function summarizeApartment(apt: Apartment, idx: number): string {
  const identifier = apt.title_en || apt.title || apt.address || `Apartment ${idx + 1}`;
  const lines = [
    `## ${identifier} (ID: ${apt.id})`,
    `- **URL:** ${apt.url ? `[View Apartment](${apt.url})` : 'N/A'}`,
    `- **Address:** ${val(apt.address)}`,
    `- **District:** ${val(apt.district_en || apt.district)}`,
    `- **Travel to Hbf (walk):** ${apt.hbf_walk_time ? `${apt.hbf_walk_time} min` : 'N/A'}`,
    `- **Travel to Hbf (bike):** ${apt.hbf_bike_time ? `${apt.hbf_bike_time} min` : 'N/A'}`,
    `- **Travel to Hbf (transit):** ${apt.hbf_transit_time ? `${apt.hbf_transit_time} min` : 'N/A'}`,
    `- **Price:** ${apt.price ? `€${apt.price.toLocaleString()}` : 'N/A'}`,
    `- **Area:** ${val(apt.area, ' m²')}`,
    `- **Price/m²:** ${apt.price_per_m2 ? `€${apt.price_per_m2.toLocaleString()}/m²` : 'N/A'}`,
    `- **Rooms:** ${val(apt.rooms)}`,
    `- **Bedrooms:** ${val(apt.bedrooms)}`,
    `- **Bathrooms:** ${val(apt.bathrooms)}`,
    `- **Floor:** ${val(apt.floor_en || apt.floor)}`,
    `- **Type:** ${val(apt.type_en || apt.type)}`,
    `- **Year Built:** ${val(apt.year_built_en || apt.year_built)}`,
    `- **Condition:** ${val(apt.condition_en || apt.condition)}`,
    `- **Heating:** ${val(apt.heating_en || apt.heating)}`,
    `- **Energy Consumption:** ${val(apt.energy_consumption_en || apt.energy_consumption)}`,
    `- **Energy Certificate:** ${val(apt.energy_cert_en || apt.energy_cert)}`,
    `- **Kitchen included:** ${apt.kitchen === null ? 'N/A' : apt.kitchen ? 'Yes' : 'No'}`,
    `- **Elevator:** ${val(apt.elevator_en || apt.elevator)}`,
    `- **Parking:** ${val(apt.parking_en || apt.parking)}`,
    `- **Hausgeld:** ${apt.hausgeld ? `€${apt.hausgeld}/month` : 'N/A'}`,
    `- **Agency Fee:** ${val(apt.agency_fee_en || apt.agency_fee)}`,
    `- **Currently Rented:** ${val(apt.rented_en || apt.rented)}`,
    `- **Deposit:** ${val(apt.deposit_en || apt.deposit)}`,
    `- **Listed Building:** ${val(apt.listed_building_en || apt.listed_building)}`,
    `- **Renovation:** ${val(apt.renovation_en || apt.renovation)}`,
  ];

  if (apt.pros_en || apt.pros) {
    lines.push(`- **Pros:** ${apt.pros_en || apt.pros}`);
  }
  if (apt.cons_en || apt.cons) {
    lines.push(`- **Cons:** ${apt.cons_en || apt.cons}`);
  }
  if (apt.user1_comment) {
    lines.push(`- **User 1 Comment:** ${apt.user1_comment}`);
  }
  if (apt.user2_comment) {
    lines.push(`- **User 2 Comment:** ${apt.user2_comment}`);
  }
  if (apt.would_buy_en || apt.would_buy) {
    lines.push(`- **Would Buy:** ${apt.would_buy_en || apt.would_buy}`);
  }
  if (apt.zone_rating_en || apt.zone_rating) {
    lines.push(`- **Zone Rating (investment):** ${apt.zone_rating_en || apt.zone_rating}`);
  }
  if (apt.preference_rating !== null && apt.preference_rating !== undefined) {
    lines.push(`- **Preference Rating:** ${apt.preference_rating}/5`);
  }
  if (apt.location_description_en || apt.location_description) {
    lines.push(`- **Location Description:** ${apt.location_description_en || apt.location_description}`);
  }
  if (apt.description_en || apt.description) {
    const desc = (apt.description_en || apt.description || '').slice(0, 500);
    lines.push(`- **Description:** ${desc}${desc.length >= 500 ? '...' : ''}`);
  }

  return lines.join('\n');
}

export function formatAllApartments(apartments: Apartment[]): string {
  if (!apartments.length) return 'No apartments to analyze.';

  const header = `# Apartment Comparison Data (${apartments.length} apartments in Leipzig, Germany)\n`;
  const summaries = apartments.map((apt, i) => summarizeApartment(apt, i));
  return header + '\n' + summaries.join('\n\n');
}

export function generateChatGPTPrompt(apartments: Apartment[]): string {
  const data = formatAllApartments(apartments);
  return `I'm looking to buy an apartment in Leipzig, Germany as an investment property. Please analyze the following ${apartments.length} apartments and help me decide which is the best option.

Consider:
1. **Value for money** — price per m², comparison to Leipzig market averages
2. **Investment potential** — rental yield, district growth, tenant demand
3. **Target demographics** — which apartments are best suited for renting to:
   - Young professionals / students (central, well-connected)
   - Couples (2-3 rooms, good area)
   - Families (3+ rooms, quiet, spacious)
4. **Running costs** — Hausgeld, energy efficiency, maintenance needs
5. **Location quality** — distance to Hauptbahnhof, district reputation
6. **Property condition** — renovation needs, year built, condition
7. **My notes** — pay attention to the pros/cons and comments I've recorded

Please provide:
- A ranked list from best to worst investment
- A summary table comparing key metrics
- Specific recommendation for the TOP pick and why
- Any red flags or concerns for specific apartments

${data}`;
}
