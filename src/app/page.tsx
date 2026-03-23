'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import FilterBar from '@/components/FilterBar';
import ApartmentList from '@/components/ApartmentList';
import ApartmentTable from '@/components/ApartmentTable';
import AddApartmentDialog from '@/components/AddApartmentDialog';
import { Map, List, ChevronDown, ChevronUp, Table2, PanelBottomClose, PanelBottomOpen, GripHorizontal } from 'lucide-react';

const ApartmentMap = dynamic(() => import('@/components/ApartmentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
});

type ViewMode = 'list' | 'table';

export default function FavoritesPage() {
  const { apartments, fetchApartments, loading, mobileTab, setMobileTab } = useStore();
  const [hydrated, setHydrated] = useState(false);
  const [filterBarExpanded, setFilterBarExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Table-mode map split
  const [tableMapVisible, setTableMapVisible] = useState(true);
  const [tableMapHeight, setTableMapHeight] = useState(300); // px
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Set filter bar expanded state based on screen size
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    setFilterBarExpanded(!isMobile);
  }, []);

  useEffect(() => {
    setHydrated(true);
    fetchApartments();
  }, [fetchApartments]);

  // Auto-fetch thumbnails for apartments that have a URL but no thumbnail
  useEffect(() => {
    if (!apartments.length) return;
    let cancelled = false;
    const fetchThumbnails = async () => {
      const missing = apartments.filter(
        (a) => a.url && !a.thumbnail_url && a.immoscout_id
      );
      
      // Process in smaller batches to prevent memory buildup
      const batchSize = 3;
      for (let i = 0; i < missing.length; i += batchSize) {
        if (cancelled) break;
        
        const batch = missing.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (apt) => {
            if (cancelled) return;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
              
              const res = await fetch('/api/scrape-thumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: apt.url }),
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (res.ok) {
                const data = await res.json();
                if (data.thumbnail) {
                  const updates: Record<string, string> = { thumbnail_url: data.thumbnail };
                  if (data.gallery?.length) {
                    updates.other_urls = JSON.stringify(data.gallery);
                  }
                  await useStore.getState().updateApartment(apt.id, updates);
                }
              }
            } catch { /* skip failed requests */ }
          })
        );
        
        // Longer delay between batches to allow memory cleanup
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    fetchThumbnails();
    return () => { cancelled = true; };
  }, [apartments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag handle for resizing map in table mode
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = tableMapHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [tableMapHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartYRef.current - e.clientY;
      const newHeight = Math.max(100, Math.min(600, dragStartHeightRef.current + delta));
      setTableMapHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!hydrated) return null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Filter bar */}
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="mx-auto max-w-screen-2xl">
          <div className="flex items-center justify-between mb-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Card list view"
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view"
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
            </div>

            <button
              onClick={() => setFilterBarExpanded(!filterBarExpanded)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              title={filterBarExpanded ? 'Collapse filters' : 'Expand filters'}
            >
              {filterBarExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-sm">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-sm">Expand</span>
                </>
              )}
            </button>
          </div>
          
          {filterBarExpanded && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <FilterBar />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <AddApartmentDialog />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== LIST VIEW MODE ===== */}
      {viewMode === 'list' && (
        <>
          {/* Mobile tab switcher */}
          <div className="flex border-b border-border bg-white md:hidden">
            <button
              onClick={() => setMobileTab('list')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === 'list'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <List className="h-4 w-4" />
              List ({apartments.length})
            </button>
            <button
              onClick={() => setMobileTab('map')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === 'map'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Map className="h-4 w-4" />
              Map
            </button>
          </div>

          {/* Desktop: split view */}
          <div className="flex-1 overflow-hidden">
            <div className="mx-auto flex h-full max-w-screen-2xl">
              {/* List panel — always visible on desktop, toggled on mobile */}
              <div
                className={`h-full overflow-y-auto p-4 md:w-1/2 lg:w-2/5 ${
                  mobileTab === 'list' ? 'w-full' : 'hidden md:block'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <ApartmentList apartments={apartments} />
                )}
              </div>

              {/* Map panel — always visible on desktop, toggled on mobile */}
              <div
                className={`h-full p-4 md:w-1/2 lg:w-3/5 ${
                  mobileTab === 'map' ? 'w-full' : 'hidden md:block'
                }`}
              >
                <ApartmentMap allApartments={apartments} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== TABLE VIEW MODE ===== */}
      {viewMode === 'table' && (
        <div className="flex-1 flex flex-col overflow-hidden" ref={splitContainerRef}>
          {/* Table panel */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <ApartmentTable apartments={apartments} />
            )}
          </div>

          {/* Drag handle + map toggle */}
          <div className="shrink-0 border-t border-border bg-muted/50 flex items-center justify-between px-3">
            <button
              onClick={() => setTableMapVisible(!tableMapVisible)}
              className="flex items-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title={tableMapVisible ? 'Hide map' : 'Show map'}
            >
              {tableMapVisible ? (
                <>
                  <PanelBottomClose className="h-3.5 w-3.5" />
                  Hide Map
                </>
              ) : (
                <>
                  <PanelBottomOpen className="h-3.5 w-3.5" />
                  Show Map
                </>
              )}
            </button>

            {tableMapVisible && (
              <div
                className="flex items-center gap-1 py-1 cursor-row-resize select-none text-muted-foreground hover:text-foreground transition-colors"
                onMouseDown={handleDragStart}
                title="Drag to resize map"
              >
                <GripHorizontal className="h-4 w-4" />
                <span className="text-[10px]">Drag to resize</span>
              </div>
            )}
          </div>

          {/* Map panel (below table) */}
          {tableMapVisible && (
            <div
              className="shrink-0 p-2"
              style={{ height: tableMapHeight }}
            >
              <ApartmentMap allApartments={apartments} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
