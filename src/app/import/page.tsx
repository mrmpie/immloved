'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { parseVisitadosSheet } from '@/lib/excel-import';
import BulkUpdateButton from '@/components/BulkUpdateButton';
import TranslateButton from '@/components/TranslateButton';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Train } from 'lucide-react';

export default function ImportPage() {
  const { importApartments, apartments } = useStore();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [migratingHbf, setMigratingHbf] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseVisitadosSheet(buffer);
      setPreview(parsed.length);

      if (parsed.length === 0) {
        setResult({
          success: false,
          message: 'No apartments found in the file. Check that it has the expected columns.',
        });
        setImporting(false);
        return;
      }

      await importApartments(parsed);
      setResult({
        success: true,
        message: `Successfully imported ${parsed.length} apartments!`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: `Error importing: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
    setImporting(false);
  };

  const handleMigrateHbf = async () => {
    setMigratingHbf(true);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/migrate-hbf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setMigrationResult({
        success: true,
        message: data.message || 'Migration completed successfully',
      });
    } catch (err) {
      setMigrationResult({
        success: false,
        message: `Migration error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
    setMigratingHbf(false);
  };

  return (
    <div className="mx-auto max-w-screen-md p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6 text-secondary" />
          Import Apartments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import apartment data from your Excel file (e.g., &quot;Apartamentos Leipzig.xlsx&quot;)
        </p>
      </div>

      {/* Current status */}
      <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2">Current Database</h2>
        <p className="text-sm text-muted-foreground mb-3">
          {apartments.length} apartments in favorites
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <BulkUpdateButton />
          <TranslateButton />
          <button
            onClick={handleMigrateHbf}
            disabled={migratingHbf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
            title="Calculate Hbf distances for all apartments without this data"
          >
            {migratingHbf ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Calculating...
              </>
            ) : (
              <>
                <Train className="h-3.5 w-3.5" />
                Calculate Hbf Distances
              </>
            )}
          </button>
        </div>
      </div>

      {/* Migration Result */}
      {migrationResult && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl border p-4 ${
            migrationResult.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {migrationResult.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-medium">{migrationResult.message}</p>
        </div>
      )}

      {/* File upload */}
      <div className="rounded-xl border-2 border-dashed border-border bg-white p-8 text-center shadow-sm hover:border-primary/50 transition-colors">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold mb-1">Upload Excel File</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Supports .xlsx files with &quot;Apartamentos Visitados&quot; or similar sheets
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {importing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Choose File
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl border p-4 ${
            result.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-medium">{result.message}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2">Expected Excel Format</h2>
        <p className="text-xs text-muted-foreground mb-2">
          The importer looks for these column headers (case-insensitive):
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-muted-foreground">
          {[
            'URL ImmoScout',
            'Price (€)',
            'Living Area (m²)',
            '# Rooms',
            'Address',
            'Title',
            'District',
            'Condition',
            'Type',
            'Year Built',
            'Floor',
            'Heating',
            'Visita feita?',
            'Compraria?',
            'Pontos a Favor',
            'Pontos Contra',
            'Contact Name',
            'Description',
          ].map((col) => (
            <span key={col} className="rounded bg-muted px-2 py-1">
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
