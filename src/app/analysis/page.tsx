'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import AiAnalysis from '@/components/AiAnalysis';

export default function AnalysisPage() {
  const { fetchApartments } = useStore();

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

  return <AiAnalysis />;
}
