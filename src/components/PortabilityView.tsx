import React, { useState, useRef } from 'react';
import { OMRSheet } from '../types/omr';
import { parseImportedJSON } from '../services/omrStorage';
import {
  Upload,
  Download,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
} from 'lucide-react';

interface PortabilityViewProps {
  sheets: OMRSheet[];
  onImportSheets: (imported: OMRSheet[]) => Promise<void>;
  onExportAllJSON: () => void;
  onExportSingleJSON: (sheet: OMRSheet) => void;
  onExportSingleCSV: (sheet: OMRSheet) => void;
  onClearAllDatabase: () => Promise<void>;
}

export const PortabilityView: React.FC<PortabilityViewProps> = ({
  sheets,
  onImportSheets,
  onExportAllJSON,
  onExportSingleJSON,
  onExportSingleCSV,
  onClearAllDatabase,
}) => {
  const [jsonPasteText, setJsonPasteText] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedSheets = parseImportedJSON(text);
      await onImportSheets(parsedSheets);
      setStatusBanner({
        type: 'success',
        message: `Imported ${parsedSheets.length} OMR ${
          parsedSheets.length === 1 ? 'sheet' : 'sheets'
        } into IndexedDB from "${file.name}".`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse OMR JSON file.',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonPasteText.trim()) {
      setStatusBanner({
        type: 'error',
        message: 'Paste valid OMR JSON data before clicking Import.',
      });
      return;
    }

    try {
      const parsedSheets = parseImportedJSON(jsonPasteText);
      await onImportSheets(parsedSheets);
      setJsonPasteText('');
      setStatusBanner({
        type: 'success',
        message: `Imported ${parsedSheets.length} OMR ${
          parsedSheets.length === 1 ? 'sheet' : 'sheets'
        } into IndexedDB.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Invalid JSON format.',
      });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800/70 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Balanced Split: Import vs Export */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left 6 cols: Import Sheets into IndexedDB */}
        <div className="lg:col-span-6 bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-sky-400 mb-1">01. Offline Data Ingestion</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Import OMR Sheets to IndexedDB
            </h1>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Upload a previously exported <code className="font-mono text-slate-300">.json</code>{' '}
              sheet or backup archive. Imported sheets are immediately stored in IndexedDB for
              offline access.
            </p>

            {/* File Upload Box */}
            <div className="mt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="omr-json-upload"
              />
              <label
                htmlFor="omr-json-upload"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-sky-400 bg-[#090D16] hover:bg-sky-950/20 rounded-xl transition-colors cursor-pointer text-center"
              >
                <Upload className="w-6 h-6 text-sky-400 mb-2" />
                <span className="text-sm font-semibold text-white">
                  Select OMR Sheet JSON File (.json)
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Supports single sheet exports or full multi-sheet backup archives
                </span>
              </label>
            </div>

            {/* Raw JSON Paste Form */}
            <form onSubmit={handlePasteImport} className="mt-6 space-y-3">
              <label
                htmlFor="raw-json-textarea"
                className="block text-xs font-semibold text-slate-300"
              >
                Or Paste Raw OMR JSON Payload
              </label>
              <textarea
                id="raw-json-textarea"
                rows={5}
                value={jsonPasteText}
                onChange={(e) => setJsonPasteText(e.target.value)}
                placeholder='{"format": "markgrid-omr-v1", "sheets": [...]}'
                className="w-full p-3 text-xs font-mono text-white placeholder:text-slate-600 bg-[#090D16] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-slate-100 hover:bg-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Validate & Import JSON</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 6 cols: Export Backup & Database Controls */}
        <div className="lg:col-span-6 bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">02. Data Portability & Backup</p>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Export IndexedDB Sheets
            </h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Download your entire OMR sheet collection as a portable JSON archive, or export
              individual graded reports as CSV spreadsheets.
            </p>

            {/* Full Backup Card */}
            <div className="mt-6 p-5 bg-[#090D16] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Full IndexedDB Backup (.json)</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'} currently stored
                  offline
                </p>
              </div>

              <button
                type="button"
                disabled={sheets.length === 0}
                onClick={onExportAllJSON}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download All ({sheets.length})</span>
              </button>
            </div>

            {/* Individual Sheet Export List */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-300 mb-3">
                Export Individual Sheets
              </h3>
              {sheets.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No sheets available in IndexedDB to export.
                </p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg max-h-60 overflow-y-auto bg-[#090D16]">
                  {sheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/40"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100 truncate">
                          {sheet.title}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-slate-400">
                          {sheet.questionCount} Questions · {sheet.stage.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onExportSingleJSON(sheet)}
                          className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                        >
                          .JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportSingleCSV(sheet)}
                          className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                        >
                          .CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone: Reset IndexedDB */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Manage local browser storage</span>
            {!confirmClearAll ? (
              <button
                type="button"
                disabled={sheets.length === 0}
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All IndexedDB Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-300">Delete all sheets?</span>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onClearAllDatabase();
                    setConfirmClearAll(false);
                    setStatusBanner({
                      type: 'success',
                      message: 'All sheets cleared from IndexedDB.',
                    });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded cursor-pointer"
                >
                  Confirm Delete All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
