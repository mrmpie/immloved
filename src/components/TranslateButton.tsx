'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { translateText, TRANSLATABLE_FIELDS } from '@/lib/translate';
import { Languages } from 'lucide-react';
import { Apartment } from '@/lib/types';

/** A field is "empty" if null, undefined, or blank string */
function isEmpty(val: unknown): boolean {
  if (val == null) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
}

/** Check if an apartment has German text that hasn't been translated yet */
function needsTranslation(apt: Apartment): boolean {
  for (const [src, tgt] of TRANSLATABLE_FIELDS) {
    const srcVal = apt[src as keyof Apartment];
    const tgtVal = apt[tgt as keyof Apartment];
    if (!isEmpty(srcVal) && isEmpty(tgtVal)) return true;
  }
  return false;
}

interface TranslateButtonProps {
  /** Optional: only translate a single apartment */
  apartmentId?: string;
}

export default function TranslateButton({ apartmentId }: TranslateButtonProps) {
  const { apartments, updateApartment } = useStore();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);

  const handleTranslate = async () => {
    let toTranslate: Apartment[];

    if (apartmentId) {
      const apt = apartments.find((a) => a.id === apartmentId);
      toTranslate = apt && needsTranslation(apt) ? [apt] : [];
    } else {
      toTranslate = apartments.filter(
        (a) => !a.is_removed && needsTranslation(a)
      );
    }

    if (toTranslate.length === 0) {
      setProgress('All translations are up to date!');
      setTimeout(() => setProgress(''), 3000);
      return;
    }

    setRunning(true);
    setTotal(toTranslate.length);
    setCurrent(0);

    let translated = 0;
    let failed = 0;

    for (let i = 0; i < toTranslate.length; i++) {
      const apt = toTranslate[i];
      setCurrent(i + 1);
      setProgress(`Translating ${i + 1}/${toTranslate.length}: ${apt.title || apt.immoscout_id}...`);

      const updates: Partial<Apartment> = {};
      let anyTranslated = false;

      for (const [src, tgt] of TRANSLATABLE_FIELDS) {
        const srcVal = apt[src as keyof Apartment] as string | null;
        const tgtVal = apt[tgt as keyof Apartment] as string | null;

        if (!isEmpty(srcVal) && isEmpty(tgtVal) && srcVal) {
          try {
            const result = await translateText(srcVal);
            if (result) {
              (updates as Record<string, string>)[tgt] = result;
              anyTranslated = true;
            }
          } catch {
            // Skip this field
          }
          // Rate limit between fields
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (anyTranslated && Object.keys(updates).length > 0) {
        await updateApartment(apt.id, updates);
        translated++;
      } else {
        failed++;
      }

      // Rate limit between apartments
      await new Promise((r) => setTimeout(r, 1000));
    }

    setRunning(false);
    const msg = `Translation done! Translated: ${translated}${failed > 0 ? `, Failed: ${failed}` : ''}`;
    setProgress(msg);
    setTimeout(() => setProgress(''), 8000);
  };

  const eligibleCount = apartmentId
    ? (apartments.find((a) => a.id === apartmentId && needsTranslation(a)) ? 1 : 0)
    : apartments.filter((a) => !a.is_removed && needsTranslation(a)).length;

  if (eligibleCount === 0 && !running && !progress) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTranslate}
        disabled={running || eligibleCount === 0}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Translate ${eligibleCount} apartment${eligibleCount !== 1 ? 's' : ''} from German to English`}
      >
        <Languages className={`h-4 w-4 ${running ? 'animate-pulse' : ''}`} />
        {running ? `${current}/${total}` : `Translate ${eligibleCount}`}
      </button>
      {progress && (
        <span className="text-xs text-muted-foreground max-w-[300px] truncate" title={progress}>
          {progress}
        </span>
      )}
    </div>
  );
}
