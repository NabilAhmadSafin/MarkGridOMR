import React, { useState } from 'react';
import { OMRSheet, ScoringRule, evaluateOMRSheet } from '../types/omr';
import {
  FileSpreadsheet,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
} from 'lucide-react';

interface NewSheetConfigProps {
  existingSheets: OMRSheet[];
  onCreateSheet: (config: {
    title: string;
    subject: string;
    questionCount: number;
    optionsCount: 4 | 5;
    scoringRule: ScoringRule;
  }) => void;
  onSelectSheet: (sheet: OMRSheet) => void;
  onDeleteSheet: (id: string) => void;
  onExportSheetJSON: (sheet: OMRSheet) => void;
  onOpenImportExport: () => void;
}

const QUESTION_PRESETS = [10, 15, 20, 25, 30, 40, 50, 100];

const SCORING_PRESETS: {
  id: string;
  label: string;
  description: string;
  rule: ScoringRule;
}[] = [
  {
    id: 'standard',
    label: 'Standard (+1 / 0)',
    description: '+1 pt correct · 0 pt wrong · 0 pt skipped',
    rule: { correctPoints: 1, wrongPoints: 0, unansweredPoints: 0 },
  },
  {
    id: 'competitive',
    label: 'Competitive (+4 / -1)',
    description: '+4 pts correct · -1 pt wrong · 0 pt skipped',
    rule: { correctPoints: 4, wrongPoints: -1, unansweredPoints: 0 },
  },
  {
    id: 'quarter_neg',
    label: 'Quarter Penalty (+1 / -0.25)',
    description: '+1 pt correct · -0.25 pt wrong · 0 pt skipped',
    rule: { correctPoints: 1, wrongPoints: -0.25, unansweredPoints: 0 },
  },
];

export const NewSheetConfig: React.FC<NewSheetConfigProps> = ({
  existingSheets,
  onCreateSheet,
  onSelectSheet,
  onDeleteSheet,
  onExportSheetJSON,
  onOpenImportExport,
}) => {
  const [questionCountInput, setQuestionCountInput] = useState<string>('20');
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [optionsCount, setOptionsCount] = useState<4 | 5>(4);
  const [scoringPresetId, setScoringPresetId] = useState<string>('standard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedQuestionCount = Math.min(
    200,
    Math.max(1, Number.parseInt(questionCountInput || '20', 10) || 20)
  );

  const selectedScoring =
    SCORING_PRESETS.find((p) => p.id === scoringPresetId)?.rule || SCORING_PRESETS[0].rule;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number.parseInt(questionCountInput, 10);
    if (Number.isNaN(num) || num < 1 || num > 200) {
      setErrorMsg('Please enter a valid number of questions between 1 and 200.');
      return;
    }
    setErrorMsg(null);

    const finalTitle =
      title.trim().length > 0
        ? title.trim()
        : `OMR Practice Sheet #${existingSheets.length + 1} (${num} Questions)`;
    const finalSubject = subject.trim().length > 0 ? subject.trim() : 'General Assessment';

    onCreateSheet({
      title: finalTitle,
      subject: finalSubject,
      questionCount: num,
      optionsCount,
      scoringRule: selectedScoring,
    });
  };

  const columnsPreview =
    parsedQuestionCount <= 10
      ? 1
      : parsedQuestionCount <= 30
        ? 2
        : parsedQuestionCount <= 60
          ? 3
          : 4;
  const rowsPerColumn = Math.ceil(parsedQuestionCount / columnsPreview);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Main 2-column balanced setup stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left 7 columns: Primary Question Count & OMR Generator Form */}
        <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <p className="text-xs font-medium text-sky-400 mb-1">
                  01. Initialize Optical Answer Sheet
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  How many questions are on the sheet?
                </h1>
              </div>
            </div>

            <form id="create-omr-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Question Count Input + Presets */}
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <label
                    htmlFor="question-count-input"
                    className="text-sm font-semibold text-slate-200"
                  >
                    Total Number of Questions (1–200)
                  </label>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    Layout: {columnsPreview} {columnsPreview === 1 ? 'Column' : 'Columns'} × up to{' '}
                    {rowsPerColumn} Rows
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                  <input
                    id="question-count-input"
                    type="number"
                    min={1}
                    max={200}
                    autoFocus
                    value={questionCountInput}
                    onChange={(e) => {
                      setQuestionCountInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-36 px-4 py-3 text-2xl font-mono font-bold tabular-nums text-white bg-[#090D16] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {QUESTION_PRESETS.map((preset) => {
                      const isActive = Number.parseInt(questionCountInput, 10) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setQuestionCountInput(String(preset));
                            setErrorMsg(null);
                          }}
                          className={`px-3 py-2 text-xs font-mono font-semibold tabular-nums rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-sky-400 text-slate-950 border-sky-400'
                              : 'bg-[#090D16] text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {preset} Qs
                        </button>
                      );
                    })}
                  </div>
                </div>
                {errorMsg && (
                  <p className="mt-2 text-xs font-medium text-rose-400" role="alert">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Options per Question & Scoring Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Bubbles per Question
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#090D16] rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOptionsCount(4)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        optionsCount === 4
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      4 Circles (1–4 / A–D)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptionsCount(5)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        optionsCount === 5
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      5 Circles (1–5 / A–E)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Grading Formula
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#090D16] rounded-lg border border-slate-800">
                    {SCORING_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setScoringPresetId(preset.id)}
                        className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 truncate cursor-pointer ${
                          scoringPresetId === preset.id
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={preset.description}
                      >
                        {preset.id === 'standard'
                          ? '+1 / 0'
                          : preset.id === 'competitive'
                            ? '+4 / -1'
                            : '+1 / -0.25'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label
                    htmlFor="sheet-title-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Sheet Name (Optional)
                  </label>
                  <input
                    id="sheet-title-input"
                    type="text"
                    placeholder={`OMR Practice Sheet #${existingSheets.length + 1}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 bg-[#090D16] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sheet-subject-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Subject / Exam Code (Optional)
                  </label>
                  <input
                    id="sheet-subject-input"
                    type="text"
                    placeholder="e.g., Physics Paper 1, SAT Math"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 bg-[#090D16] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              <span>Auto-saved to browser IndexedDB</span>
              <span className="mx-1.5 text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>Offline ready</span>
            </div>
            <button
              type="submit"
              form="create-omr-form"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Generate {parsedQuestionCount}-Question OMR Sheet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right 5 columns: Interactive Keyboard Workflow Preview & Architecture */}
        <div className="lg:col-span-5 bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">
              02. Rapid Numpad & Optical Grading Workflow
            </p>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Built for Speed & Instant Verification
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Mark bubbles directly from your keyboard number row or numpad, or click any circle to
              toggle options.
            </p>

            {/* Interactive Live Demo Row Preview */}
            <div className="mt-6 p-4 bg-[#090D16] border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className="font-semibold text-slate-200">Key-to-Bubble Mapping Preview</span>
                <span className="font-mono tabular-nums text-sky-400">
                  Press 1–{optionsCount} on Keyboard
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-3.5 bg-[#0F172A] border border-slate-800 rounded-lg">
                <span className="font-mono text-sm font-bold tabular-nums text-slate-200 w-8">
                  01.
                </span>
                <div className="flex items-center gap-2.5">
                  {Array.from({ length: optionsCount }).map((_, idx) => {
                    const letter = ['A', 'B', 'C', 'D', 'E'][idx];
                    const isSampleMarked = idx === 1;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold border-2 transition-transform ${
                            isSampleMarked
                              ? 'bg-sky-400 text-slate-950 border-sky-300'
                              : 'bg-[#090D16] text-slate-300 border-slate-700'
                          }`}
                        >
                          {letter}
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          Key [{idx + 1}]
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3-Step Workflow Summary */}
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold tabular-nums text-sky-400 mt-0.5">
                  01.
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Bubble Your Sheet (Keys 1–{optionsCount} or Click)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Press <kbd className="font-mono font-semibold text-slate-200">1</kbd> for the
                    first circle, <kbd className="font-mono font-semibold text-slate-200">2</kbd>{' '}
                    for the second circle, and so on. Auto-advances to the next question row.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold tabular-nums text-sky-400 mt-0.5">
                  02.
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Manually Fill the Answer Key OMR
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Once finished, switch to the Answer Key sheet and bubble in the official
                    answers using the exact same rapid OMR interface.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold tabular-nums text-sky-400 mt-0.5">
                  03.
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Green & Red Highlighted Original OMR
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    View your immediate score with correct bubbles highlighted in emerald green and
                    errors highlighted in crimson red alongside the true key.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Have an exported JSON sheet?</span>
            <button
              type="button"
              onClick={onOpenImportExport}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              Import OMR Sheet from JSON
            </button>
          </div>
        </div>
      </div>

      {/* Saved OMR Sheets in IndexedDB Quick Access */}
      {existingSheets.length > 0 && (
        <section className="mt-10 bg-[#0F172A] border border-slate-800/90 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">
                Saved OMR Sheets in Offline Storage
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stored locally in IndexedDB · {existingSheets.length}{' '}
                {existingSheets.length === 1 ? 'sheet' : 'sheets'} available
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenImportExport}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Manage Import & Export
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 mt-2">
            {existingSheets.slice(0, 5).map((sheet) => {
              const summary = evaluateOMRSheet(sheet);
              const dateStr = new Date(sheet.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sheet.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors px-3 -mx-3 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onSelectSheet(sheet)}
                        className="text-sm font-bold text-slate-100 hover:text-sky-400 truncate text-left cursor-pointer"
                      >
                        {sheet.title}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                      <span className="font-sans text-slate-300">{sheet.subject}</span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>{sheet.questionCount} Questions</span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {summary.answeredCount}/{sheet.questionCount} Marked
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      {sheet.stage === 'graded' ? (
                        <span className="text-emerald-400 font-semibold">
                          Graded: {summary.totalScore}/{summary.maxScore} ({summary.percentage}%)
                        </span>
                      ) : sheet.stage === 'filling_key' ? (
                        <span className="text-amber-400 font-semibold">
                          Awaiting Answer Key ({summary.keyFilledCount}/{sheet.questionCount})
                        </span>
                      ) : (
                        <span className="text-sky-400 font-semibold">In Progress</span>
                      )}
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-sans">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectSheet(sheet)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {sheet.stage === 'graded' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>View Graded OMR</span>
                        </>
                      ) : sheet.stage === 'filling_key' ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Fill Answer Key</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Continue Sheet</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportSheetJSON(sheet)}
                      title="Export Sheet as JSON"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSheet(sheet.id)}
                      title="Delete Sheet"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
