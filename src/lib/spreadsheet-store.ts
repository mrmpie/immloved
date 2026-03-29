import { create } from 'zustand';
import { Apartment } from './types';

export interface CustomColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'formula';
  formula?: string;
  color?: string;
  width?: number;
}

interface SpreadsheetState {
  customColumns: CustomColumn[];
  cells: Record<string, Record<string, string | number | null>>;
  cellColors: Record<string, Record<string, string>>;
  loaded: boolean;

  fetchSpreadsheet: () => Promise<void>;
  updateCell: (apartmentId: string, columnKey: string, value: string | number | null) => Promise<void>;
  setCellColor: (apartmentId: string, columnKey: string, color: string | null) => Promise<void>;
  addColumn: (column: CustomColumn) => Promise<void>;
  updateColumn: (columnKey: string, updates: Partial<CustomColumn>) => Promise<void>;
  removeColumn: (columnKey: string) => Promise<void>;
  reorderColumns: (order: string[]) => Promise<void>;
}

// Evaluate a simple formula like "=price/area" or "=price*0.035+hausgeld"
export function evaluateFormula(formula: string, apartment: Apartment, cells: Record<string, string | number | null>): string | number | null {
  if (!formula || !formula.startsWith('=')) return null;
  const expr = formula.slice(1).trim();

  try {
    // Build a context of available variables from apartment fields and custom cells
    const vars: Record<string, number> = {};

    // Numeric apartment fields
    const numericFields: (keyof Apartment)[] = [
      'price', 'area', 'price_per_m2', 'rooms', 'bedrooms', 'bathrooms',
      'hausgeld', 'preference_rating', 'rank_order',
      'hbf_walk_time', 'hbf_walk_dist', 'hbf_bike_time', 'hbf_bike_dist',
      'hbf_transit_time', 'hbf_straight_dist',
    ];
    for (const field of numericFields) {
      const val = apartment[field];
      if (typeof val === 'number') vars[field] = val;
    }

    // Custom cell values (numbers)
    for (const [key, val] of Object.entries(cells)) {
      if (typeof val === 'number') vars[key] = val;
      else if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) vars[key] = num;
      }
    }

    // Replace variable names with values in the expression
    // Sort by length desc to avoid partial replacements (e.g. "price_per_m2" before "price")
    const sortedKeys = Object.keys(vars).sort((a, b) => b.length - a.length);
    let evalExpr = expr;
    for (const key of sortedKeys) {
      const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      evalExpr = evalExpr.replace(regex, String(vars[key]));
    }

    // Only allow safe characters: digits, operators, parens, dots, spaces
    if (!/^[\d\s+\-*/().,%]+$/.test(evalExpr)) {
      return '#ERR';
    }

    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${evalExpr});`)();
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return '#ERR';
  } catch {
    return '#ERR';
  }
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  customColumns: [],
  cells: {},
  cellColors: {},
  loaded: false,

  fetchSpreadsheet: async () => {
    try {
      const res = await fetch('/api/spreadsheet');
      if (!res.ok) throw new Error('Failed to fetch spreadsheet');
      const data = await res.json();
      set({
        customColumns: data.columns || [],
        cells: data.cells || {},
        cellColors: data.cellColors || {},
        loaded: true,
      });
    } catch (err) {
      console.error('Failed to fetch spreadsheet:', err);
      set({ loaded: true });
    }
  },

  updateCell: async (apartmentId, columnKey, value) => {
    // Optimistic update
    set((state) => {
      const newCells = { ...state.cells };
      if (!newCells[apartmentId]) newCells[apartmentId] = {};
      newCells[apartmentId] = { ...newCells[apartmentId], [columnKey]: value };
      return { cells: newCells };
    });

    try {
      await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_cell', apartmentId, columnKey, value }),
      });
    } catch (err) {
      console.error('Failed to update cell:', err);
    }
  },

  setCellColor: async (apartmentId, columnKey, color) => {
    set((state) => {
      const newColors = { ...state.cellColors };
      if (!newColors[apartmentId]) newColors[apartmentId] = {};
      if (color) {
        newColors[apartmentId] = { ...newColors[apartmentId], [columnKey]: color };
      } else {
        const { [columnKey]: _, ...rest } = newColors[apartmentId];
        newColors[apartmentId] = rest;
      }
      return { cellColors: newColors };
    });

    try {
      await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_cell_color', apartmentId, columnKey, color }),
      });
    } catch (err) {
      console.error('Failed to set cell color:', err);
    }
  },

  addColumn: async (column) => {
    try {
      const res = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_column', column }),
      });
      const data = await res.json();
      if (data.columns) set({ customColumns: data.columns });
    } catch (err) {
      console.error('Failed to add column:', err);
    }
  },

  updateColumn: async (columnKey, updates) => {
    try {
      const res = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_column', columnKey, updates }),
      });
      const data = await res.json();
      if (data.columns) set({ customColumns: data.columns });
    } catch (err) {
      console.error('Failed to update column:', err);
    }
  },

  removeColumn: async (columnKey) => {
    try {
      const res = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_column', columnKey }),
      });
      const data = await res.json();
      if (data.columns) set({ customColumns: data.columns });
      // Clean up local state
      set((state) => {
        const newCells = { ...state.cells };
        for (const aptId of Object.keys(newCells)) {
          const { [columnKey]: _, ...rest } = newCells[aptId];
          newCells[aptId] = rest;
        }
        return { cells: newCells };
      });
    } catch (err) {
      console.error('Failed to remove column:', err);
    }
  },

  reorderColumns: async (order) => {
    try {
      const res = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder_columns', order }),
      });
      const data = await res.json();
      if (data.columns) set({ customColumns: data.columns });
    } catch (err) {
      console.error('Failed to reorder columns:', err);
    }
  },
}));
