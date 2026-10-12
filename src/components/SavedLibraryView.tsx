import React, { useState, useMemo } from 'react';
import { OMRSheet, evaluateOMRSheet } from '../types/omr';
import {
  Search,
  FileSpreadsheet,
  Play,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Trash2,
  Plus,
} from 'lucide-react';

interface SavedLibraryViewProps {
  sheets: OMRSheet[];
  activeSheetId: string | null;
  onSelectSheet: (sheet: OMRSheet) => void;
  onDuplicateSheet: (sheet: OMRSheet) => void;
  onDeleteSheet: (id: string) => void;
  onExportJSON: (sheet: OMRSheet) => void;
  onExportCSV: (sheet: OMRSheet) => void;
  onCreateNew: () => void;
  onOpenImportExport: () => void;
}

type StageFilter = 'all' | 'graded' | 'filling_key' | 'filling_responses';

export const SavedLibraryView: React.FC<SavedLibraryViewProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onExportJSON,
  onExportCSV,
  onCreateNew,
  onOpenImportExport,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');

  const filteredSheets = useMemo(() => {
    return sheets.filter((sheet) => {
      if (stageFilter !== 'all' && sheet.stage !== stageFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          sheet.title.toLowerCase().includes(q) || sheet.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sheets, stageFilter, searchQuery]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
      {/* Header & Summary */}
      <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <p className="text-xs font-medium text-sky-400 mb-1">
              Offline IndexedDB Storage Repository
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Saved OMR Sheets ({sheets.length})
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Every OMR sheet, student mark, and answer key is automatically persisted in your
              browser’s local IndexedDB database.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenImportExport}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Import / Export Backup
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New OMR Sheet</span>
            </button>
          </div>
        </div>

        {/* Search & Segmented Filter Controls */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sheets by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 bg-[#090D16] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#090D16] border border-slate-800 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Sheets ({sheets.length})
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('graded')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === 'graded'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Graded ({sheets.filter((s) => s.stage === 'graded').length})
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('filling_key')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === 'filling_key'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Awaiting Key ({sheets.filter((s) => s.stage === 'filling_key').length})
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('filling_responses')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === 'filling_responses'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In Progress ({sheets.filter((s) => s.stage === 'filling_responses').length})
            </button>
          </div>
        </div>

        {/* Sheet Table / Rows */}
        {filteredSheets.length === 0 ? (
          <div className="mt-8 py-12 text-center border border-dashed border-slate-800 rounded-lg">
            <p className="text-sm font-semibold text-slate-300">
              {sheets.length === 0
                ? 'No OMR sheets saved in IndexedDB yet.'
                : 'No saved OMR sheets match your current filter.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Create a new OMR sheet or import an existing JSON backup file.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onCreateNew}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg cursor-pointer"
              >
                Create First OMR Sheet
              </button>
              <button
                type="button"
                onClick={onOpenImportExport}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Import JSON File
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-800/80">
            {filteredSheets.map((sheet) => {
              const summary = evaluateOMRSheet(sheet);
              const isCurrent = sheet.id === activeSheetId;
              const updatedStr = new Date(sheet.updatedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sheet.id}
                  className={`py-4 px-3 -mx-3 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isCurrent ? 'bg-sky-950/25' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onSelectSheet(sheet)}
                        className="text-sm font-bold text-slate-100 hover:text-sky-400 truncate text-left cursor-pointer"
                      >
                        {sheet.title}
                      </button>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-sky-400">· Active</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                      <span className="font-sans text-slate-300">{sheet.subject}</span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>{sheet.questionCount} Qs</span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>{sheet.optionsCount} Options</span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        Marked: {summary.answeredCount}/{sheet.questionCount}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        Key: {summary.keyFilledCount}/{sheet.questionCount}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      {sheet.stage === 'graded' ? (
                        <span className="text-emerald-400 font-semibold">
                          Score: {summary.totalScore}/{summary.maxScore} ({summary.percentage}% ·{' '}
                          {summary.correctCount}✓ {summary.wrongCount}✕)
                        </span>
                      ) : sheet.stage === 'filling_key' ? (
                        <span className="text-amber-400 font-semibold">Filling Answer Key</span>
                      ) : (
                        <span className="text-sky-400 font-semibold">Filling OMR</span>
                      )}
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-sans">{updatedStr}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectSheet(sheet)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {sheet.stage === 'graded' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Open Graded OMR</span>
                        </>
                      ) : sheet.stage === 'filling_key' ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Fill Answer Key</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Open OMR Sheet</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateSheet(sheet)}
                      title="Duplicate Sheet Structure"
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onExportJSON(sheet)}
                      title="Export Sheet as JSON"
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onExportCSV(sheet)}
                      title="Export Graded Report as CSV"
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSheet(sheet.id)}
                      title="Delete Sheet from IndexedDB"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
