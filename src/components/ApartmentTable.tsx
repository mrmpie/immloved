'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { applyFilters } from '@/lib/filters';
import { formatPrice, formatPricePerM2 } from '@/lib/utils';
import { useSpreadsheetStore, evaluateFormula, CustomColumn } from '@/lib/spreadsheet-store';
import { ArrowUp, ArrowDown, ArrowUpDown, Check, Star, GripVertical, Settings, X, Plus, Trash2, Palette } from 'lucide-react';

// Map of column keys to their corresponding Apartment field for Supabase sync
const APARTMENT_FIELD_MAP: Record<string, keyof Apartment> = {
  title: 'title',
  price: 'price',
  area: 'area',
  rooms: 'rooms',
  bathrooms: 'bathrooms',
  floor: 'floor',
  hausgeld: 'hausgeld',
  district: 'district',
  address: 'address',
  pros: 'pros',
  cons: 'cons',
  rating: 'preference_rating',
  type: 'type',
  condition: 'condition',
  year_built: 'year_built',
  available_from: 'available_from',
  heating: 'heating',
  elevator: 'elevator',
  parking: 'parking',
  deposit: 'deposit',
  agency_fee: 'agency_fee',
  contact_name: 'contact_name',
  contact_company: 'contact_company',
  user1_comment: 'user1_comment',
  user2_comment: 'user2_comment',
};

// Numeric apartment fields (parse as number when editing)
const NUMERIC_APT_FIELDS = new Set(['price', 'area', 'rooms', 'bathrooms', 'hausgeld', 'rating']);

// Column definition
interface ColumnDef {
  key: string;
  label: string;
  width: number; // min-width in px
  getValue: (apt: Apartment) => string | number | null;
  renderCell?: (apt: Apartment) => React.ReactNode;
  sortValue?: (apt: Apartment) => number | string | null;
  align?: 'left' | 'center' | 'right';
  editable?: boolean;
  isCustom?: boolean;
  customColumn?: CustomColumn;
}

interface ApartmentTableProps {
  apartments: Apartment[];
}

export default function ApartmentTable({ apartments }: ApartmentTableProps) {
  const {
    filters,
    selectedApartmentId,
    setSelectedApartment,
    setCenterMapApartment,
    setFilteredIds,
    userName1,
    userName2,
    tableColumnOrder,
    setTableColumnOrder,
    updateApartment,
  } = useStore();

  const {
    customColumns,
    cells: spreadsheetCells,
    cellColors,
    loaded: spreadsheetLoaded,
    fetchSpreadsheet,
    updateCell: updateSpreadsheetCell,
    setCellColor,
    addColumn,
    removeColumn,
  } = useSpreadsheetStore();

  // Per-column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  // Table sort (independent from global sort)
  const [tableSortKey, setTableSortKey] = useState<string>('price');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');
  // Column settings panel
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  // Drag reorder state
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ aptId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Color picker state
  const [colorPickerCell, setColorPickerCell] = useState<{ aptId: string; colKey: string; x: number; y: number } | null>(null);

  // New column dialog
  const [showNewColumnDialog, setShowNewColumnDialog] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number' | 'formula'>('text');
  const [newColFormula, setNewColFormula] = useState('');

  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  // Load spreadsheet data on mount
  useEffect(() => {
    if (!spreadsheetLoaded) fetchSpreadsheet();
  }, [spreadsheetLoaded, fetchSpreadsheet]);

  // Column definitions
  const columns: ColumnDef[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      width: 220,
      getValue: (a) => a.title_en || a.title || '',
      renderCell: (a) => (
        <span className="font-medium line-clamp-1" title={a.title_en || a.title || ''}>
          {a.title_en || a.title || '—'}
        </span>
      ),
      editable: true,
    },
    {
      key: 'price',
      label: 'Price',
      width: 110,
      getValue: (a) => a.price,
      renderCell: (a) => (
        <span className="font-bold text-primary whitespace-nowrap">{formatPrice(a.price)}</span>
      ),
      sortValue: (a) => a.price,
      align: 'right',
      editable: true,
    },
    {
      key: 'area',
      label: 'm²',
      width: 70,
      getValue: (a) => a.area,
      renderCell: (a) => <span className="whitespace-nowrap">{a.area != null ? `${a.area} m²` : '—'}</span>,
      sortValue: (a) => a.area,
      align: 'right',
      editable: true,
    },
    {
      key: 'price_per_m2',
      label: '€/m²',
      width: 90,
      getValue: (a) => a.price_per_m2,
      renderCell: (a) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatPricePerM2(a.price_per_m2)}</span>
      ),
      sortValue: (a) => a.price_per_m2,
      align: 'right',
    },
    {
      key: 'rooms',
      label: 'Rooms',
      width: 65,
      getValue: (a) => a.rooms,
      sortValue: (a) => a.rooms,
      align: 'center',
      editable: true,
    },
    {
      key: 'bathrooms',
      label: 'Bath',
      width: 55,
      getValue: (a) => a.bathrooms,
      sortValue: (a) => a.bathrooms,
      align: 'center',
      editable: true,
    },
    {
      key: 'floor',
      label: 'Floor',
      width: 80,
      getValue: (a) => a.floor_en || a.floor || '',
      editable: true,
    },
    {
      key: 'hausgeld',
      label: 'Hausgeld',
      width: 90,
      getValue: (a) => a.hausgeld,
      renderCell: (a) => (
        <span className="whitespace-nowrap">{a.hausgeld != null ? `€${a.hausgeld}` : '—'}</span>
      ),
      sortValue: (a) => a.hausgeld,
      align: 'right',
      editable: true,
    },
    {
      key: 'district',
      label: 'District',
      width: 120,
      getValue: (a) => a.district_en || a.district || '',
      editable: true,
    },
    {
      key: 'address',
      label: 'Street',
      width: 180,
      getValue: (a) => a.address || '',
      renderCell: (a) => (
        <span className="line-clamp-1" title={a.address || ''}>
          {a.address || '—'}
        </span>
      ),
      editable: true,
    },
    {
      key: 'hbf_transit_time',
      label: 'Hbf Transit',
      width: 90,
      getValue: (a) => a.hbf_transit_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_transit_time != null ? `~${a.hbf_transit_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_transit_time,
      align: 'center',
    },
    {
      key: 'hbf_bike_time',
      label: 'Hbf Bike',
      width: 80,
      getValue: (a) => a.hbf_bike_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_bike_time != null ? `${a.hbf_bike_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_bike_time,
      align: 'center',
    },
    {
      key: 'hbf_walk_time',
      label: 'Hbf Walk',
      width: 80,
      getValue: (a) => a.hbf_walk_time,
      renderCell: (a) => (
        <span className="whitespace-nowrap">
          {a.hbf_walk_time != null ? `${a.hbf_walk_time} min` : '—'}
        </span>
      ),
      sortValue: (a) => a.hbf_walk_time,
      align: 'center',
    },
    {
      key: 'pros',
      label: 'Pros',
      width: 200,
      getValue: (a) => a.pros_en || a.pros || '',
      renderCell: (a) => {
        const text = a.pros_en || a.pros || '';
        return (
          <span className="line-clamp-2 text-green-700" title={text}>
            {text || '—'}
          </span>
        );
      },
      editable: true,
    },
    {
      key: 'cons',
      label: 'Cons',
      width: 200,
      getValue: (a) => a.cons_en || a.cons || '',
      renderCell: (a) => {
        const text = a.cons_en || a.cons || '';
        return (
          <span className="line-clamp-2 text-red-600" title={text}>
            {text || '—'}
          </span>
        );
      },
      editable: true,
    },
    {
      key: 'rating',
      label: 'Rating',
      width: 100,
      getValue: (a) => a.preference_rating,
      renderCell: (a) => (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-3 w-3 ${
                a.preference_rating != null && s <= a.preference_rating
                  ? 'text-accent fill-accent'
                  : 'text-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      ),
      sortValue: (a) => a.preference_rating,
      align: 'center',
      editable: true,
    },
    {
      key: 'favorites',
      label: 'Favs',
      width: 70,
      getValue: (a) => {
        const parts = [];
        if (a.user1_favorite) parts.push(userName1);
        if (a.user2_favorite) parts.push(userName2);
        return parts.join(', ');
      },
      renderCell: (a) => (
        <div className="flex items-center gap-1">
          {a.user1_favorite && <span title={userName1}>💖</span>}
          {a.user2_favorite && <span title={userName2}>💙</span>}
        </div>
      ),
      align: 'center',
    },
    {
      key: 'visited',
      label: 'Visited',
      width: 140,
      getValue: (a) => {
        const parts = [];
        if (a.user1_visited) parts.push(`${userName1}: ${a.user1_visit_date || 'yes'}`);
        if (a.user2_visited) parts.push(`${userName2}: ${a.user2_visit_date || 'yes'}`);
        return parts.join(', ') || '';
      },
      renderCell: (a) => (
        <div className="flex flex-col gap-0.5 text-[10px]">
          {a.user1_visited && (
            <span className="text-green-600 flex items-center gap-0.5">
              <Check className="h-3 w-3" />
              {userName1}{a.user1_visit_date ? `: ${a.user1_visit_date}` : ''}
            </span>
          )}
          {a.user2_visited && (
            <span className="text-green-600 flex items-center gap-0.5">
              <Check className="h-3 w-3" />
              {userName2}{a.user2_visit_date ? `: ${a.user2_visit_date}` : ''}
            </span>
          )}
          {!a.user1_visited && !a.user2_visited && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: 100,
      getValue: (a) => a.type_en || a.type || '',
      editable: true,
    },
    {
      key: 'condition',
      label: 'Condition',
      width: 100,
      getValue: (a) => a.condition_en || a.condition || '',
      editable: true,
    },
    {
      key: 'year_built',
      label: 'Year',
      width: 65,
      getValue: (a) => a.year_built_en || a.year_built || '',
      editable: true,
    },
    {
      key: 'available_from',
      label: 'Available',
      width: 100,
      getValue: (a) => a.available_from_en || a.available_from || '',
      editable: true,
    },
    {
      key: 'heating',
      label: 'Heating',
      width: 120,
      getValue: (a) => a.heating_en || a.heating || '',
      editable: true,
    },
    {
      key: 'elevator',
      label: 'Elevator',
      width: 80,
      getValue: (a) => a.elevator_en || a.elevator || '',
      editable: true,
    },
    {
      key: 'parking',
      label: 'Parking',
      width: 100,
      getValue: (a) => a.parking_en || a.parking || '',
      editable: true,
    },
    {
      key: 'deposit',
      label: 'Deposit',
      width: 100,
      getValue: (a) => a.deposit_en || a.deposit || '',
      editable: true,
    },
    {
      key: 'agency_fee',
      label: 'Agency Fee',
      width: 100,
      getValue: (a) => a.agency_fee_en || a.agency_fee || '',
      editable: true,
    },
    {
      key: 'contact_name',
      label: 'Contact',
      width: 140,
      getValue: (a) => a.contact_name || '',
      editable: true,
    },
    {
      key: 'contact_company',
      label: 'Company',
      width: 140,
      getValue: (a) => a.contact_company || '',
      editable: true,
    },
    {
      key: 'user1_comment',
      label: `${userName1} Comment`,
      width: 200,
      getValue: (a) => a.user1_comment || '',
      renderCell: (a) => {
        const text = a.user1_comment || '';
        return (
          <span className="line-clamp-2 text-muted-foreground" title={text}>
            {text || '—'}
          </span>
        );
      },
      editable: true,
    },
    {
      key: 'user2_comment',
      label: `${userName2} Comment`,
      width: 200,
      getValue: (a) => a.user2_comment || '',
      renderCell: (a) => {
        const text = a.user2_comment || '';
        return (
          <span className="line-clamp-2 text-muted-foreground" title={text}>
            {text || '—'}
          </span>
        );
      },
      editable: true,
    },
    ...customColumns.map((cc): ColumnDef => ({
      key: `custom_${cc.key}`,
      label: cc.label,
      width: cc.width || 120,
      isCustom: true,
      customColumn: cc,
      editable: cc.type !== 'formula',
      align: cc.type === 'number' || cc.type === 'formula' ? 'right' : 'left',
      getValue: (a) => {
        if (cc.type === 'formula' && cc.formula) {
          const aptCells = spreadsheetCells[a.id] || {};
          return evaluateFormula(cc.formula, a, aptCells);
        }
        const cellVal = spreadsheetCells[a.id]?.[cc.key];
        return cellVal ?? null;
      },
      sortValue: (a) => {
        if (cc.type === 'formula' && cc.formula) {
          const aptCells = spreadsheetCells[a.id] || {};
          const r = evaluateFormula(cc.formula, a, aptCells);
          return typeof r === 'number' ? r : null;
        }
        const cellVal = spreadsheetCells[a.id]?.[cc.key];
        if (cellVal == null) return null;
        const n = Number(cellVal);
        return isNaN(n) ? String(cellVal) : n;
      },
    })),
  ], [userName1, userName2, customColumns, spreadsheetCells]);

  // Ordered columns based on saved order
  const orderedColumns = useMemo(() => {
    if (!tableColumnOrder || tableColumnOrder.length === 0) return columns;
    const colMap = new Map(columns.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of tableColumnOrder) {
      const col = colMap.get(key);
      if (col) {
        ordered.push(col);
        colMap.delete(key);
      }
    }
    // Append any new columns not in saved order
    for (const col of colMap.values()) {
      ordered.push(col);
    }
    return ordered;
  }, [columns, tableColumnOrder]);

  // Column reorder handlers
  const handleColumnDragStart = useCallback((key: string) => {
    setDraggedCol(key);
  }, []);

  const handleColumnDragOver = useCallback((key: string) => {
    setDragOverCol(key);
  }, []);

  const handleColumnDrop = useCallback((targetKey: string) => {
    if (!draggedCol || draggedCol === targetKey) {
      setDraggedCol(null);
      setDragOverCol(null);
      return;
    }
    const currentOrder = orderedColumns.map((c) => c.key);
    const fromIdx = currentOrder.indexOf(draggedCol);
    const toIdx = currentOrder.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedCol);
    setTableColumnOrder(newOrder);
    setDraggedCol(null);
    setDragOverCol(null);
  }, [draggedCol, orderedColumns, setTableColumnOrder]);

  // 1) Apply global filters
  const globalFiltered = useMemo(
    () => applyFilters(apartments, filters),
    [apartments, filters]
  );

  // Sync filtered IDs to store so map can gray out non-matching apartments
  useEffect(() => {
    const ids = new Set(globalFiltered.map((a) => a.id));
    setFilteredIds(ids);
    return () => setFilteredIds(null);
  }, [globalFiltered, setFilteredIds]);

  // 2) Apply per-column filters
  const columnFiltered = useMemo(() => {
    let result = globalFiltered;
    for (const [colKey, filterText] of Object.entries(columnFilters)) {
      if (!filterText.trim()) continue;
      const col = orderedColumns.find((c) => c.key === colKey);
      if (!col) continue;
      const q = filterText.toLowerCase();
      result = result.filter((apt) => {
        const val = col.getValue(apt);
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      });
    }
    return result;
  }, [globalFiltered, columnFilters, orderedColumns]);

  // 3) Apply table-level sorting
  const sorted = useMemo(() => {
    const col = orderedColumns.find((c) => c.key === tableSortKey);
    if (!col) return columnFiltered;

    const getSortVal = col.sortValue || col.getValue;
    const dir = tableSortDir === 'asc' ? 1 : -1;

    return [...columnFiltered].sort((a, b) => {
      const av = getSortVal(a);
      const bv = getSortVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [columnFiltered, tableSortKey, tableSortDir, orderedColumns]);

  // Handle column header click for sorting
  const handleSort = useCallback((key: string) => {
    if (tableSortKey === key) {
      // Same column - toggle direction
      setTableSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      // Different column - set new key and reset to ascending
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  }, [tableSortKey]);

  // Handle column filter change
  const handleColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle row click
  const handleRowClick = useCallback(
    (apt: Apartment) => {
      const newId = apt.id === selectedApartmentId ? null : apt.id;
      setSelectedApartment(newId);
      if (newId) {
        setCenterMapApartment(newId);
      }
    },
    [selectedApartmentId, setSelectedApartment, setCenterMapApartment]
  );

  // Scroll selected row into view when selection changes (e.g. from map marker click)
  useEffect(() => {
    if (selectedApartmentId && selectedApartmentId !== prevSelectedIdRef.current) {
      setTimeout(() => {
        if (selectedRowRef.current) {
          selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
    prevSelectedIdRef.current = selectedApartmentId;
  }, [selectedApartmentId]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerCell) return;
    const handler = () => setColorPickerCell(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [colorPickerCell]);

  // Start editing a cell
  const startEditing = useCallback((aptId: string, colKey: string, currentValue: string | number | null) => {
    setEditingCell({ aptId, colKey });
    setEditValue(currentValue != null ? String(currentValue) : '');
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Commit an edit: if it's an apartment field, update Supabase; if custom, update spreadsheet
  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { aptId, colKey } = editingCell;
    const trimmed = editValue.trim();

    // Check if this is a custom column (key starts with "custom_")
    if (colKey.startsWith('custom_')) {
      const realKey = colKey.replace('custom_', '');
      const cc = customColumns.find((c) => c.key === realKey);
      let val: string | number | null = trimmed || null;
      if (cc?.type === 'number' && trimmed) {
        const num = parseFloat(trimmed);
        val = isNaN(num) ? trimmed : num;
      }
      await updateSpreadsheetCell(aptId, realKey, val);
    } else {
      // It's an apartment field - update in Supabase
      const aptField = APARTMENT_FIELD_MAP[colKey];
      if (aptField) {
        let parsedValue: string | number | null = trimmed || null;
        if (NUMERIC_APT_FIELDS.has(colKey) && trimmed) {
          const num = parseFloat(trimmed);
          parsedValue = isNaN(num) ? null : num;
        }
        try {
          await updateApartment(aptId, { [aptField]: parsedValue } as Partial<Apartment>);
        } catch (err) {
          console.error('Failed to update apartment field:', err);
        }
      }
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, customColumns, updateSpreadsheetCell, updateApartment]);

  // Handle Tab key to move to the next editable cell
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Move to next/prev editable cell in the same row
      if (editingCell) {
        const editableCols = orderedColumns.filter((c) => c.editable);
        const curIdx = editableCols.findIndex((c) => c.key === editingCell.colKey);
        const nextIdx = e.shiftKey ? curIdx - 1 : curIdx + 1;
        if (nextIdx >= 0 && nextIdx < editableCols.length) {
          const nextCol = editableCols[nextIdx];
          const apt = sorted.find((a) => a.id === editingCell.aptId);
          if (apt) {
            const val = nextCol.getValue(apt);
            startEditing(editingCell.aptId, nextCol.key, val);
          }
        }
      }
    }
  }, [commitEdit, cancelEditing, editingCell, orderedColumns, sorted, startEditing]);

  // Handle right-click for color picker
  const handleCellContextMenu = useCallback((e: React.MouseEvent, aptId: string, colKey: string) => {
    e.preventDefault();
    setColorPickerCell({ aptId, colKey, x: e.clientX, y: e.clientY });
  }, []);

  // Color palette for cells
  const CELL_COLORS = [
    '#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#fed7d7',
    '#e9d5ff', '#cffafe', '#fef9c3', '#d1fae5', '#ede9fe', '#ffe4e6',
  ];

  // Handle adding a new custom column
  const handleAddColumn = useCallback(async () => {
    if (!newColLabel.trim()) return;
    const key = newColLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!key) return;
    await addColumn({
      key,
      label: newColLabel.trim(),
      type: newColType,
      formula: newColType === 'formula' ? newColFormula : undefined,
      width: 120,
    });
    setShowNewColumnDialog(false);
    setNewColLabel('');
    setNewColType('text');
    setNewColFormula('');
  }, [newColLabel, newColType, newColFormula, addColumn]);

  if (sorted.length === 0 && apartments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🏘️</span>
        <p className="text-lg font-medium text-muted-foreground">No apartments found</p>
        <p className="text-sm text-muted-foreground">Import from Excel or add apartments manually</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-muted-foreground px-2 py-1.5 border-b border-border bg-white shrink-0 flex items-center justify-between">
        <span>Showing {sorted.length} of {apartments.length} apartments</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewColumnDialog(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Add custom column"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Column</span>
          </button>
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showColumnSettings ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
            title="Customize columns"
          >
            <Settings className="h-3 w-3" />
            <span className="hidden sm:inline">Columns</span>
          </button>
        </div>
      </div>

      {/* Column settings panel */}
      {showColumnSettings && (
        <div className="border-b border-border bg-muted/30 px-3 py-2 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Drag columns to reorder</span>
            <button
              onClick={() => setShowColumnSettings(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {orderedColumns.map((col) => (
              <div
                key={col.key}
                draggable
                onDragStart={() => handleColumnDragStart(col.key)}
                onDragOver={(e) => { e.preventDefault(); handleColumnDragOver(col.key); }}
                onDrop={() => handleColumnDrop(col.key)}
                onDragEnd={() => { setDraggedCol(null); setDragOverCol(null); }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium cursor-grab active:cursor-grabbing border transition-colors ${
                  draggedCol === col.key
                    ? 'opacity-50 border-primary bg-primary/10'
                    : dragOverCol === col.key
                    ? 'border-primary bg-primary/5'
                    : col.isCustom
                    ? 'border-purple-300 bg-purple-50 hover:border-purple-400'
                    : 'border-border bg-white hover:border-primary/50'
                }`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                {col.label}
                {col.isCustom && col.customColumn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeColumn(col.customColumn!.key); }}
                    className="ml-0.5 text-red-400 hover:text-red-600"
                    title="Delete custom column"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto apartment-table-wrapper">
        <table className="apartment-table w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            {/* Header labels */}
            <tr className="bg-muted/80 backdrop-blur-sm">
              {orderedColumns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-border px-2 py-1.5 font-semibold text-muted-foreground cursor-pointer hover:bg-muted select-none whitespace-nowrap"
                  style={{ minWidth: col.width, textAlign: col.align || 'left' }}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1" style={{ justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
                    <span>{col.label}</span>
                    {tableSortKey === col.key ? (
                      tableSortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {/* Column filter inputs */}
            <tr className="bg-white border-b border-border">
              {orderedColumns.map((col) => (
                <th key={`filter-${col.key}`} className="px-1 py-1 border-r border-border">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={columnFilters[col.key] || ''}
                    onChange={(e) => handleColumnFilter(col.key, e.target.value)}
                    className="w-full rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-normal"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((apt) => {
              const isSelected = apt.id === selectedApartmentId;
              return (
                <tr
                  key={apt.id}
                  ref={isSelected ? selectedRowRef : undefined}
                  data-apartment-id={apt.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                      : 'hover:bg-muted/50 even:bg-muted/20'
                  }`}
                  onClick={() => handleRowClick(apt)}
                >
                  {orderedColumns.map((col) => {
                    const isEditing = editingCell?.aptId === apt.id && editingCell?.colKey === col.key;
                    const colorKey = col.isCustom && col.customColumn ? col.customColumn.key : col.key;
                    const bgColor = cellColors[apt.id]?.[colorKey];
                    return (
                      <td
                        key={col.key}
                        className={`border-b border-r border-border px-2 py-1.5 ${col.editable ? 'cursor-cell' : ''}`}
                        style={{ textAlign: col.align || 'left', backgroundColor: bgColor || undefined }}
                        onDoubleClick={(e) => {
                          if (col.editable) {
                            e.stopPropagation();
                            startEditing(apt.id, col.key, col.getValue(apt));
                          }
                        }}
                        onContextMenu={(e) => handleCellContextMenu(e, apt.id, colorKey)}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={commitEdit}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-white border border-primary rounded px-1 py-0 text-xs outline-none ring-1 ring-primary/30"
                            style={{ textAlign: col.align || 'left', minWidth: 40 }}
                          />
                        ) : col.renderCell ? (
                          col.renderCell(apt)
                        ) : (
                          col.getValue(apt) ?? '—'
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Color picker popup */}
      {colorPickerCell && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-border p-2"
          style={{ left: colorPickerCell.x, top: colorPickerCell.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
            <Palette className="h-3 w-3" /> Cell Color
          </div>
          <div className="grid grid-cols-4 gap-1">
            {CELL_COLORS.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded border ${color === '#ffffff' ? 'border-border' : 'border-transparent'} hover:ring-2 hover:ring-primary/40`}
                style={{ backgroundColor: color }}
                title={color === '#ffffff' ? 'No color' : color}
                onClick={() => {
                  setCellColor(colorPickerCell.aptId, colorPickerCell.colKey, color === '#ffffff' ? null : color);
                  setColorPickerCell(null);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* New column dialog */}
      {showNewColumnDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowNewColumnDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl border border-border p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Add Custom Column</h3>
              <button onClick={() => setShowNewColumnDialog(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Column Name</label>
                <input
                  type="text"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  placeholder="e.g. Monthly Cost"
                  className="w-full mt-0.5 rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as 'text' | 'number' | 'formula')}
                  className="w-full mt-0.5 rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="formula">Formula</option>
                </select>
              </div>
              {newColType === 'formula' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Formula</label>
                  <input
                    type="text"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                    placeholder="e.g. =price/area or =hausgeld*12"
                    className="w-full mt-0.5 rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Use apartment fields: price, area, rooms, hausgeld, etc.
                  </p>
                </div>
              )}
              <button
                onClick={handleAddColumn}
                disabled={!newColLabel.trim()}
                className="w-full mt-2 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
