import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Row ID — use 'default' for now; switch to user_id when auth is added
const SPREADSHEET_ID = 'default';

interface CustomColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'formula';
  formula?: string;
  color?: string;
  width?: number;
}

interface SpreadsheetData {
  columns: CustomColumn[];
  cells: Record<string, Record<string, string | number | null>>;
  cellColors: Record<string, Record<string, string>>;
}

async function readSpreadsheet(): Promise<SpreadsheetData> {
  if (!isSupabaseConfigured() || !supabase) {
    return { columns: [], cells: {}, cellColors: {} };
  }

  const { data, error } = await supabase
    .from('spreadsheet_data')
    .select('columns, cells, cell_colors')
    .eq('id', SPREADSHEET_ID)
    .single();

  if (error || !data) {
    // Row might not exist yet — return defaults
    return { columns: [], cells: {}, cellColors: {} };
  }

  return {
    columns: (data.columns as CustomColumn[]) || [],
    cells: (data.cells as Record<string, Record<string, string | number | null>>) || {},
    cellColors: (data.cell_colors as Record<string, Record<string, string>>) || {},
  };
}

async function writeSpreadsheet(data: SpreadsheetData): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase
    .from('spreadsheet_data')
    .upsert({
      id: SPREADSHEET_ID,
      columns: data.columns,
      cells: data.cells,
      cell_colors: data.cellColors,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to write spreadsheet to Supabase:', error);
    throw error;
  }
}

// GET: Read all spreadsheet data
export async function GET() {
  try {
    const data = await readSpreadsheet();
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET spreadsheet error:', err);
    return NextResponse.json({ error: 'Failed to read spreadsheet' }, { status: 500 });
  }
}

// POST: Update spreadsheet (cell edit, add/remove column, set color)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const data = await readSpreadsheet();

    switch (action) {
      case 'update_cell': {
        const { apartmentId, columnKey, value } = body;
        if (!apartmentId || !columnKey) {
          return NextResponse.json({ error: 'Missing apartmentId or columnKey' }, { status: 400 });
        }
        if (!data.cells[apartmentId]) data.cells[apartmentId] = {};
        data.cells[apartmentId][columnKey] = value ?? null;
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true });
      }

      case 'update_cells_bulk': {
        const { updates } = body;
        if (!Array.isArray(updates)) {
          return NextResponse.json({ error: 'Missing updates array' }, { status: 400 });
        }
        for (const u of updates) {
          if (!data.cells[u.apartmentId]) data.cells[u.apartmentId] = {};
          data.cells[u.apartmentId][u.columnKey] = u.value ?? null;
        }
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true });
      }

      case 'set_cell_color': {
        const { apartmentId, columnKey, color } = body;
        if (!apartmentId || !columnKey) {
          return NextResponse.json({ error: 'Missing apartmentId or columnKey' }, { status: 400 });
        }
        if (!data.cellColors[apartmentId]) data.cellColors[apartmentId] = {};
        if (color) {
          data.cellColors[apartmentId][columnKey] = color;
        } else {
          delete data.cellColors[apartmentId][columnKey];
        }
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true });
      }

      case 'add_column': {
        const { column } = body as { column: CustomColumn };
        if (!column || !column.key || !column.label) {
          return NextResponse.json({ error: 'Missing column key/label' }, { status: 400 });
        }
        if (data.columns.some((c) => c.key === column.key)) {
          return NextResponse.json({ error: 'Column key already exists' }, { status: 400 });
        }
        data.columns.push({
          key: column.key,
          label: column.label,
          type: column.type || 'text',
          formula: column.formula,
          color: column.color,
          width: column.width,
        });
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true, columns: data.columns });
      }

      case 'update_column': {
        const { columnKey, updates: colUpdates } = body;
        if (!columnKey) {
          return NextResponse.json({ error: 'Missing columnKey' }, { status: 400 });
        }
        const colIdx = data.columns.findIndex((c) => c.key === columnKey);
        if (colIdx === -1) {
          return NextResponse.json({ error: 'Column not found' }, { status: 404 });
        }
        data.columns[colIdx] = { ...data.columns[colIdx], ...colUpdates };
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true, columns: data.columns });
      }

      case 'remove_column': {
        const { columnKey } = body;
        if (!columnKey) {
          return NextResponse.json({ error: 'Missing columnKey' }, { status: 400 });
        }
        data.columns = data.columns.filter((c) => c.key !== columnKey);
        for (const aptId of Object.keys(data.cells)) {
          delete data.cells[aptId][columnKey];
        }
        for (const aptId of Object.keys(data.cellColors)) {
          delete data.cellColors[aptId][columnKey];
        }
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true, columns: data.columns });
      }

      case 'reorder_columns': {
        const { order } = body as { order: string[] };
        if (!Array.isArray(order)) {
          return NextResponse.json({ error: 'Missing order array' }, { status: 400 });
        }
        const colMap = new Map(data.columns.map((c) => [c.key, c]));
        const reordered: CustomColumn[] = [];
        for (const key of order) {
          const col = colMap.get(key);
          if (col) reordered.push(col);
        }
        for (const col of data.columns) {
          if (!order.includes(col.key)) reordered.push(col);
        }
        data.columns = reordered;
        await writeSpreadsheet(data);
        return NextResponse.json({ success: true, columns: data.columns });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('POST spreadsheet error:', err);
    return NextResponse.json({ error: 'Failed to update spreadsheet' }, { status: 500 });
  }
}
