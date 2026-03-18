import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPricePerM2(price: number | null): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price) + '/m²';
}

export function parseNumber(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  const s = String(val).trim()
    .replace(/[€m²\s]/g, '')
    .replace(/\./g, '_DOT_')
    .replace(/,/g, '.')
    .replace(/_DOT_/g, '');
  // Handle German number format: 299.000 or 299.000,00
  const raw = String(val).trim().replace(/[€m²\s]/g, '');
  let normalized: string;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const parts = raw.split('.');
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  } else {
    normalized = raw;
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

export function extractImmoscoutId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/expose\/(\d+)/);
  return match ? match[1] : null;
}

export function getImmoscoutUrl(id: string): string {
  return `https://www.immobilienscout24.de/expose/${id}`;
}

export function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
