/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { OMRSheet, ScoringRule } from './types/omr';
import {
  ensureSeedSheetsIfEmpty,
  saveSheet,
  saveMultipleSheets,
  deleteSheet,
  clearAllSheets,
  exportSheetAsJSON,
  exportAllSheetsAsJSON,
  exportSheetAsCSV,
} from './services/omrStorage';
import { NewSheetConfig } from './components/NewSheetConfig';
import { OMRGridWorkspace } from './components/OMRGridWorkspace';
import { SavedLibraryView } from './components/SavedLibraryView';
import { PortabilityView } from './components/PortabilityView';

type NavTab = 'new' | 'workspace' | 'library' | 'portability';

export default function App() {
  const [sheets, setSheets] = useState<OMRSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('new');
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);

  // Load sheets from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    ensureSeedSheetsIfEmpty()
      .then((loaded) => {
        if (!mounted) return;
        setSheets(loaded);
        if (loaded.length > 0) {
          setActiveSheetId(loaded[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load sheets from IndexedDB:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingDB(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;

  const handleCreateSheet = useCallback(
    async (config: {
      title: string;
      subject: string;
      questionCount: number;
      optionsCount: 4 | 5;
      scoringRule: ScoringRule;
    }) => {
      const now = Date.now();
      const newSheet: OMRSheet = {
        id: `omr-${now}-${Math.random().toString(36).slice(2, 7)}`,
        title: config.title,
        subject: config.subject,
        questionCount: config.questionCount,
        optionsCount: config.optionsCount,
        responses: {},
        answerKey: {},
        stage: 'filling_responses',
        scoringRule: config.scoringRule,
        createdAt: now,
        updatedAt: now,
        durationSeconds: 0,
      };

      const saved = await saveSheet(newSheet);
      setSheets((prev) => [saved, ...prev]);
      setActiveSheetId(saved.id);
      setActiveTab('workspace');
    },
    []
  );

  const handleUpdateSheet = useCallback(async (updated: OMRSheet) => {
    // Optimistically update state for zero-latency bubble response
    const stamped: OMRSheet = { ...updated, updatedAt: Date.now() };
    setSheets((prev) => {
      const idx = prev.findIndex((s) => s.id === stamped.id);
      if (idx === -1) return [stamped, ...prev];
      const copy = [...prev];
      copy[idx] = stamped;
      return copy;
    });
    try {
      await saveSheet(stamped);
    } catch (err) {
      console.error('Failed to save OMR sheet to IndexedDB:', err);
    }
  }, []);

  const handleSelectSheet = useCallback((sheet: OMRSheet) => {
    setActiveSheetId(sheet.id);
    setActiveTab('workspace');
  }, []);

  const handleDuplicateSheet = useCallback(async (source: OMRSheet) => {
    const now = Date.now();
    const cloned: OMRSheet = {
      ...source,
      id: `omr-${now}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${source.title} (Copy)`,
      responses: {},
      stage: 'filling_responses',
      createdAt: now,
      updatedAt: now,
    };
    const saved = await saveSheet(cloned);
    setSheets((prev) => [saved, ...prev]);
    setActiveSheetId(saved.id);
    setActiveTab('workspace');
  }, []);

  const handleDeleteSheet = useCallback(
    async (id: string) => {
      await deleteSheet(id);
      setSheets((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (activeSheetId === id) {
          setActiveSheetId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    },
    [activeSheetId]
  );

  const handleImportSheets = useCallback(async (imported: OMRSheet[]) => {
    await saveMultipleSheets(imported);
    setSheets((prev) => {
      const map = new Map<string, OMRSheet>();
      for (const s of prev) map.set(s.id, s);
      for (const s of imported) map.set(s.id, s);
      const merged = Array.from(map.values());
      merged.sort((a, b) => b.updatedAt - a.updatedAt);
      return merged;
    });
    if (imported.length > 0) {
      setActiveSheetId(imported[0].id);
    }
  }, []);

  const handleClearAllDatabase = useCallback(async () => {
    await clearAllSheets();
    setSheets([]);
    setActiveSheetId(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-[#0D1322] border-b border-slate-800/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#new"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('new');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          MarkGrid OMR
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="flex items-center gap-7 text-sm font-medium text-slate-400 overflow-x-auto">
          <a
            href="#new"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('new');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 decoration-sky-400 decoration-2 ${
              activeTab === 'new' ? 'text-white font-semibold underline' : ''
            }`}
          >
            New Sheet
          </a>
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              if (activeSheet) {
                setActiveTab('workspace');
              } else {
                setActiveTab('new');
              }
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 decoration-sky-400 decoration-2 ${
              activeTab === 'workspace' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Active Sheet
          </a>
          <a
            href="#library"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('library');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 decoration-sky-400 decoration-2 ${
              activeTab === 'library' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Saved Sheets
          </a>
          <a
            href="#portability"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('portability');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 decoration-sky-400 decoration-2 ${
              activeTab === 'portability' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Import & Export
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'new') {
                setActiveTab('portability');
              } else {
                setActiveTab('new');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {activeTab === 'new' ? 'Import / Export' : 'New OMR Sheet'}
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1">
        {isLoadingDB ? (
          <div className="max-w-[1200px] mx-auto px-6 py-12">
            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-8 space-y-4 animate-pulse">
              <div className="h-6 w-64 bg-slate-800 rounded" />
              <div className="h-12 w-full bg-slate-800/70 rounded-lg" />
              <div className="h-32 w-full bg-slate-800/70 rounded-lg" />
            </div>
          </div>
        ) : activeTab === 'new' ? (
          <NewSheetConfig
            existingSheets={sheets}
            onCreateSheet={handleCreateSheet}
            onSelectSheet={handleSelectSheet}
            onDeleteSheet={handleDeleteSheet}
            onExportSheetJSON={exportSheetAsJSON}
            onOpenImportExport={() => setActiveTab('portability')}
          />
        ) : activeTab === 'workspace' && activeSheet ? (
          <OMRGridWorkspace
            sheet={activeSheet}
            onUpdateSheet={handleUpdateSheet}
            onExportJSON={exportSheetAsJSON}
            onExportCSV={exportSheetAsCSV}
            onCreateNewRequest={() => setActiveTab('new')}
          />
        ) : activeTab === 'library' ? (
          <SavedLibraryView
            sheets={sheets}
            activeSheetId={activeSheet?.id ?? null}
            onSelectSheet={handleSelectSheet}
            onDuplicateSheet={handleDuplicateSheet}
            onDeleteSheet={handleDeleteSheet}
            onExportJSON={exportSheetAsJSON}
            onExportCSV={exportSheetAsCSV}
            onCreateNew={() => setActiveTab('new')}
            onOpenImportExport={() => setActiveTab('portability')}
          />
        ) : (
          <PortabilityView
            sheets={sheets}
            onImportSheets={handleImportSheets}
            onExportAllJSON={() => exportAllSheetsAsJSON(sheets)}
            onExportSingleJSON={exportSheetAsJSON}
            onExportSingleCSV={exportSheetAsCSV}
            onClearAllDatabase={handleClearAllDatabase}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="px-6 py-4 bg-[#0D1322] border-t border-slate-800/90 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-slate-300 font-medium">MarkGrid Optical Answer Sheet & Grader</span>
          <span className="mx-2 text-slate-600" aria-hidden="true">
            ·
          </span>
          <span>Offline IndexedDB Storage</span>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            New Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Saved Sheets ({sheets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portability')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Export JSON Backup
          </button>
        </div>
      </footer>
    </div>
  );
}
