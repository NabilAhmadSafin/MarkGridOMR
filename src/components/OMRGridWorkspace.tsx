import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  OMRSheet,
  OMRStage,
  evaluateOMRSheet,
  getOptionLabel,
  QuestionEvaluationStatus,
} from '../types/omr';
import {
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Keyboard,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';

interface OMRGridWorkspaceProps {
  sheet: OMRSheet;
  onUpdateSheet: (updated: OMRSheet) => void;
  onExportJSON: (sheet: OMRSheet) => void;
  onExportCSV: (sheet: OMRSheet) => void;
  onCreateNewRequest: () => void;
}

type GradedFilter = 'all' | 'correct' | 'wrong' | 'unanswered';

export const OMRGridWorkspace: React.FC<OMRGridWorkspaceProps> = ({
  sheet,
  onUpdateSheet,
  onExportJSON,
  onExportCSV,
  onCreateNewRequest,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [gradedFilter, setGradedFilter] = useState<GradedFilter>('all');
  const [showOriginalInKeyMode, setShowOriginalInKeyMode] = useState<boolean>(true);
  const [columnsCount, setColumnsCount] = useState<1 | 2 | 3 | 4>(() => {
    if (sheet.questionCount <= 10) return 1;
    if (sheet.questionCount <= 30) return 2;
    if (sheet.questionCount <= 60) return 3;
    return 4;
  });
  const [confirmClearModal, setConfirmClearModal] = useState<'responses' | 'key' | null>(null);

  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Reset active question to 1 when switching sheets or stages
  useEffect(() => {
    setActiveQuestion(1);
    setGradedFilter('all');
  }, [sheet.id, sheet.stage]);

  // Adjust default columns when sheet changes
  useEffect(() => {
    if (sheet.questionCount <= 10) setColumnsCount(1);
    else if (sheet.questionCount <= 30) setColumnsCount(2);
    else if (sheet.questionCount <= 60) setColumnsCount(3);
    else setColumnsCount(4);
  }, [sheet.id, sheet.questionCount]);

  // Scroll active question into view smoothly if outside viewport
  useEffect(() => {
    const el = rowRefs.current[activeQuestion];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeQuestion]);

  const gradeSummary = useMemo(() => evaluateOMRSheet(sheet), [sheet]);

  // Toggle or set a bubble for a specific question
  const handleSelectBubble = useCallback(
    (
      questionNum: number,
      optionIndex: number,
      source: 'keyboard' | 'click',
      forceSet?: boolean
    ) => {
      if (questionNum < 1 || questionNum > sheet.questionCount) return;
      if (optionIndex < 0 || optionIndex >= sheet.optionsCount) return;

      const isKeyMode = sheet.stage === 'filling_key';
      const targetMap = isKeyMode ? { ...sheet.answerKey } : { ...sheet.responses };
      const currentVal = targetMap[questionNum] ?? null;

      // On click, clicking the already-selected bubble toggles it off.
      // On keyboard, pressing the same number key also toggles it off unless forceSet is true.
      const nextVal = !forceSet && currentVal === optionIndex ? null : optionIndex;
      targetMap[questionNum] = nextVal;

      const updated: OMRSheet = {
        ...sheet,
        responses: isKeyMode ? sheet.responses : targetMap,
        answerKey: isKeyMode ? targetMap : sheet.answerKey,
      };

      onUpdateSheet(updated);

      if (source === 'keyboard' && autoAdvance && nextVal !== null) {
        setActiveQuestion((prev) => Math.min(sheet.questionCount, prev + 1));
      } else {
        setActiveQuestion(questionNum);
      }
    },
    [sheet, onUpdateSheet, autoAdvance]
  );

  const handleClearQuestion = useCallback(
    (questionNum: number) => {
      const isKeyMode = sheet.stage === 'filling_key';
      const targetMap = isKeyMode ? { ...sheet.answerKey } : { ...sheet.responses };
      if (targetMap[questionNum] === null || targetMap[questionNum] === undefined) return;

      targetMap[questionNum] = null;
      onUpdateSheet({
        ...sheet,
        responses: isKeyMode ? sheet.responses : targetMap,
        answerKey: isKeyMode ? targetMap : sheet.answerKey,
      });
    },
    [sheet, onUpdateSheet]
  );

  // Global keyboard handler for numpad 1-5, top-row 1-5, A-E, arrows, backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if typing in an input, textarea, or select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // In graded mode, allow arrow navigation
      if (sheet.stage === 'graded') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveQuestion((q) => Math.min(sheet.questionCount, q + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveQuestion((q) => Math.max(1, q - 1));
        }
        return;
      }

      // Check number keys 1-5 (both standard Digit1..5 and Numpad1..5)
      let matchedOption: number | null = null;
      let keyLabel = '';

      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        matchedOption = 0;
        keyLabel = '1 → Circle A';
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        matchedOption = 1;
        keyLabel = '2 → Circle B';
      } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
        matchedOption = 2;
        keyLabel = '3 → Circle C';
      } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
        matchedOption = 3;
        keyLabel = '4 → Circle D';
      } else if (
        (e.key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') &&
        sheet.optionsCount >= 5
      ) {
        matchedOption = 4;
        keyLabel = '5 → Circle E';
      } else if (e.key.toLowerCase() === 'a') {
        matchedOption = 0;
        keyLabel = 'A → Circle 1';
      } else if (e.key.toLowerCase() === 'b') {
        matchedOption = 1;
        keyLabel = 'B → Circle 2';
      } else if (e.key.toLowerCase() === 'c') {
        matchedOption = 2;
        keyLabel = 'C → Circle 3';
      } else if (e.key.toLowerCase() === 'd') {
        matchedOption = 3;
        keyLabel = 'D → Circle 4';
      } else if (e.key.toLowerCase() === 'e' && sheet.optionsCount >= 5) {
        matchedOption = 4;
        keyLabel = 'E → Circle 5';
      }

      if (matchedOption !== null) {
        e.preventDefault();
        setLastKeyPressed(`Q${activeQuestion}: Key ${keyLabel}`);
        handleSelectBubble(activeQuestion, matchedOption, 'keyboard', true);
        return;
      }

      if (
        e.key === '0' ||
        e.code === 'Numpad0' ||
        e.key === 'Backspace' ||
        e.key === 'Delete'
      ) {
        e.preventDefault();
        setLastKeyPressed(`Q${activeQuestion}: Cleared`);
        handleClearQuestion(activeQuestion);
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setActiveQuestion((q) => Math.min(sheet.questionCount, q + 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveQuestion((q) => Math.max(1, q - 1));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    sheet.stage,
    sheet.questionCount,
    sheet.optionsCount,
    activeQuestion,
    handleSelectBubble,
    handleClearQuestion,
  ]);

  const handleStageChange = (nextStage: OMRStage) => {
    onUpdateSheet({
      ...sheet,
      stage: nextStage,
    });
  };

  const handleClearAllCurrentMode = () => {
    if (confirmClearModal === 'responses') {
      onUpdateSheet({
        ...sheet,
        responses: {},
        stage: 'filling_responses',
      });
      setActiveQuestion(1);
    } else if (confirmClearModal === 'key') {
      onUpdateSheet({
        ...sheet,
        answerKey: {},
        stage: 'filling_key',
      });
      setActiveQuestion(1);
    }
    setConfirmClearModal(null);
  };

  // Build question list filtered (in graded mode) and split into columns
  const visibleQuestions = useMemo(() => {
    const all = Array.from({ length: sheet.questionCount }, (_, i) => i + 1);
    if (sheet.stage !== 'graded' || gradedFilter === 'all') {
      return all;
    }
    return all.filter((q) => {
      const status = gradeSummary.evaluations[q]?.status;
      if (gradedFilter === 'correct') return status === 'correct';
      if (gradedFilter === 'wrong') return status === 'wrong';
      if (gradedFilter === 'unanswered') return status === 'unanswered' || status === 'unkeyed';
      return true;
    });
  }, [sheet.questionCount, sheet.stage, gradedFilter, gradeSummary]);

  const questionColumns = useMemo(() => {
    if (visibleQuestions.length === 0) return [];
    const effectiveCols = Math.min(
      columnsCount,
      Math.max(1, Math.ceil(visibleQuestions.length / 5))
    );
    const itemsPerCol = Math.ceil(visibleQuestions.length / effectiveCols);
    const cols: number[][] = [];
    for (let c = 0; c < effectiveCols; c++) {
      const slice = visibleQuestions.slice(c * itemsPerCol, (c + 1) * itemsPerCol);
      if (slice.length > 0) cols.push(slice);
    }
    return cols;
  }, [visibleQuestions, columnsCount]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Sheet Header & Workflow Stage Bar */}
      <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-semibold text-slate-200">{sheet.subject}</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums">{sheet.questionCount} Questions</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums">
                {sheet.optionsCount} Options (1–{sheet.optionsCount} / A–
                {getOptionLabel(sheet.optionsCount - 1)})
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums">
                Scoring: +{sheet.scoringRule.correctPoints} / {sheet.scoringRule.wrongPoints}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {sheet.title}
            </h1>
          </div>

          {/* 3-Stage Interactive Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-[#090D16] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => handleStageChange('filling_responses')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sheet.stage === 'filling_responses'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Fill OMR Sheet ({gradeSummary.answeredCount}/{sheet.questionCount})
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('filling_key')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sheet.stage === 'filling_key'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Answer Key OMR ({gradeSummary.keyFilledCount}/{sheet.questionCount})
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('graded')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sheet.stage === 'graded'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Graded Results ({gradeSummary.percentage}%)
              </button>
            </div>
          </div>
        </div>

        {/* Stage-Specific Action & Instruction Banner */}
        {sheet.stage === 'filling_responses' && (
          <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#090D16] border border-slate-800 rounded-lg p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  Step 1: Mark Your OMR Answer Sheet (Active Row: Q{activeQuestion})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Press number keys{' '}
                {Array.from({ length: sheet.optionsCount }).map((_, idx) => (
                  <React.Fragment key={idx}>
                    <kbd className="px-1.5 py-0.5 mx-0.5 font-mono text-[11px] font-bold bg-slate-800 border border-slate-700 rounded text-sky-300">
                      {idx + 1}
                    </kbd>
                    <span className="text-slate-300">for {getOptionLabel(idx)}</span>
                    {idx < sheet.optionsCount - 1 ? ', ' : ' '}
                  </React.Fragment>
                ))}
                or click any circle to toggle. When finished, proceed to fill the Answer Key OMR.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClearModal('responses')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-rose-300 bg-slate-900 hover:bg-rose-950/50 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('filling_key')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Finish Sheet & Enter Answer Key</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {sheet.stage === 'filling_key' && (
          <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-950/25 border border-amber-800/60 rounded-lg p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  Step 2: Manually Fill the Official Answer Key OMR (Active Row: Q{activeQuestion})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Bubble in the correct answer key for each question using number keys{' '}
                <span className="font-mono font-bold text-amber-300">
                  1–{sheet.optionsCount}
                </span>{' '}
                or by clicking the circles. Live score updates automatically as you mark each key.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-amber-200">
                <span>
                  Key Filled: <strong>{gradeSummary.keyFilledCount}</strong>/{sheet.questionCount}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span>
                  Immediate Live Score: <strong>{gradeSummary.totalScore}</strong> /{' '}
                  {gradeSummary.maxScore} ({gradeSummary.percentage}%)
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-emerald-400">Correct: {gradeSummary.correctCount}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-rose-400">Wrong: {gradeSummary.wrongCount}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowOriginalInKeyMode((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showOriginalInKeyMode ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Original Marks</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Original Marks</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearModal('key')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-rose-300 bg-slate-900 hover:bg-rose-950/50 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Key</span>
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('graded')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Grade & Highlight Original OMR</span>
              </button>
            </div>
          </div>
        )}

        {sheet.stage === 'graded' && (
          <div className="mt-5 space-y-4">
            {/* Immediate Score KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-[#090D16] border border-slate-800 rounded-lg">
              <div>
                <p className="text-xs text-slate-400">Immediate Total Score</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-white">
                  {gradeSummary.totalScore}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    / {gradeSummary.maxScore}
                  </span>
                </p>
                <p className="text-xs font-mono tabular-nums text-sky-400 mt-0.5">
                  {gradeSummary.percentage}% Overall
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Correct Answers (Green)</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-emerald-400">
                  {gradeSummary.correctCount}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  +{sheet.scoringRule.correctPoints} pt each
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Wrong Answers (Red)</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-rose-400">
                  {gradeSummary.wrongCount}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sheet.scoringRule.wrongPoints} pt each
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Unanswered / Skipped</p>
                <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-amber-400">
                  {gradeSummary.unansweredCount}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {gradeSummary.answeredCount}/{sheet.questionCount} attempted
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-400">Attempt Accuracy</p>
                  <p className="mt-1 text-2xl font-mono font-bold tabular-nums text-white">
                    {gradeSummary.accuracyOfAttempted}%
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => onExportCSV(sheet)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Warning if Answer Key is incomplete */}
            {gradeSummary.keyFilledCount < sheet.questionCount && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-950/35 border border-amber-800/60 rounded-lg text-xs text-amber-200">
                <span>
                  Note: Only <strong>{gradeSummary.keyFilledCount}</strong> of{' '}
                  <strong>{sheet.questionCount}</strong> answer key bubbles have been filled so far.
                  Fill the remaining answer keys for a complete score.
                </span>
                <button
                  type="button"
                  onClick={() => handleStageChange('filling_key')}
                  className="px-3 py-1.5 font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Complete Answer Key OMR
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirmation bar if user clicked Clear */}
        {confirmClearModal && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/70 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-rose-200">
              Are you sure you want to clear all marked{' '}
              {confirmClearModal === 'key' ? 'Answer Key bubbles' : 'OMR response bubbles'} on this
              sheet?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 rounded-md hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllCurrentMode}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md cursor-pointer"
              >
                Yes, Clear Bubbles
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OMR Sheet Controls & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0F172A] border border-slate-800/90 rounded-xl px-5 py-3.5">
        {/* Left: Keyboard Controls / Filter Controls */}
        {sheet.stage !== 'graded' ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-500"
              />
              <span>Auto-advance row on keypress (1–{sheet.optionsCount})</span>
            </label>

            <span className="text-slate-700" aria-hidden="true">
              |
            </span>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
              <span>Active Question:</span>
              <span className="font-bold text-white">
                #{String(activeQuestion).padStart(2, '0')}
              </span>
              {lastKeyPressed && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sky-400 font-semibold">{lastKeyPressed}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter buttons in Graded mode */}
            <div className="flex items-center gap-1 p-1 bg-[#090D16] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setGradedFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  gradedFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({sheet.questionCount})
              </button>
              <button
                type="button"
                onClick={() => setGradedFilter('correct')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  gradedFilter === 'correct'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-emerald-400 hover:bg-emerald-950/50'
                }`}
              >
                Correct ({gradeSummary.correctCount})
              </button>
              <button
                type="button"
                onClick={() => setGradedFilter('wrong')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  gradedFilter === 'wrong'
                    ? 'bg-rose-500 text-white'
                    : 'text-rose-400 hover:bg-rose-950/50'
                }`}
              >
                Wrong ({gradeSummary.wrongCount})
              </button>
              <button
                type="button"
                onClick={() => setGradedFilter('unanswered')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  gradedFilter === 'unanswered'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-amber-400 hover:bg-amber-950/50'
                }`}
              >
                Skipped ({gradeSummary.unansweredCount})
              </button>
            </div>

            {/* Visual Legend for Green & Red Highlighted Original OMR */}
            <div className="hidden xl:flex items-center gap-4 text-xs text-slate-400 pl-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-flex items-center justify-center text-[9px] text-slate-950 font-bold">
                  ✓
                </span>
                <span>Correct Match</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-flex items-center justify-center text-[9px] text-white font-bold">
                  ✕
                </span>
                <span>Your Wrong Bubble</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-950 border-2 border-emerald-400 inline-block" />
                <span>Correct Answer Key</span>
              </span>
            </div>
          </div>
        )}

        {/* Right: Column Layout Selector & Export */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Grid Columns:</span>
            <div className="flex items-center gap-1 p-0.5 bg-[#090D16] border border-slate-800 rounded-md">
              {([1, 2, 3, 4] as const).map((colOpt) => (
                <button
                  key={colOpt}
                  type="button"
                  onClick={() => setColumnsCount(colOpt)}
                  className={`px-2 py-0.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
                    columnsCount === colOpt
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {colOpt}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onExportJSON(sheet)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sheet JSON</span>
          </button>
        </div>
      </div>

      {/* Physical Optical OMR Sheet Surface (Dark Mode Instrument Grade) */}
      <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl overflow-hidden">
        {/* Authentic Scantron / Optical Form Top Timing Strip */}
        <div className="px-6 py-3.5 bg-[#0B1120] border-b border-slate-800 text-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-mono tracking-wider uppercase font-semibold text-slate-200">
              {sheet.stage === 'filling_responses'
                ? 'OPTICAL MARK RECOGNITION SHEET — STUDENT RESPONSE FORM'
                : sheet.stage === 'filling_key'
                  ? 'OPTICAL MARK RECOGNITION SHEET — MASTER ANSWER KEY ENTRY'
                  : 'OPTICAL MARK RECOGNITION SHEET — GRADED ORIGINAL OMR VERIFICATION'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400">
            <span>
              KEY MAPPING:{' '}
              {Array.from({ length: sheet.optionsCount })
                .map((_, idx) => `[${idx + 1}]=${getOptionLabel(idx)}`)
                .join('  ')}
            </span>
          </div>
        </div>

        {/* Multi-column OMR Bubble Grid */}
        {visibleQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-300">
              No questions match the selected filter ({gradedFilter}).
            </p>
            <button
              type="button"
              onClick={() => setGradedFilter('all')}
              className="mt-3 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 cursor-pointer"
            >
              Show All {sheet.questionCount} Questions
            </button>
          </div>
        ) : (
          <div
            className={`p-4 sm:p-6 grid gap-6 ${
              questionColumns.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : questionColumns.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : questionColumns.length === 3
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
            }`}
          >
            {questionColumns.map((colQuestions, colIdx) => (
              <div
                key={colIdx}
                className="border border-slate-800 rounded-lg overflow-hidden bg-[#0B1120]"
              >
                {/* Column Header */}
                <div className="px-3.5 py-2.5 bg-[#131C31] border-b border-slate-800 flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                  <span>Q#</span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: sheet.optionsCount }).map((_, optIdx) => (
                      <span
                        key={optIdx}
                        className="w-10 text-center text-slate-300"
                        title={`Press ${optIdx + 1} on keyboard for option ${getOptionLabel(optIdx)}`}
                      >
                        {getOptionLabel(optIdx)}({optIdx + 1})
                      </span>
                    ))}
                  </div>
                  <span className="w-16 text-right">
                    {sheet.stage === 'graded'
                      ? 'Result'
                      : sheet.stage === 'filling_key'
                        ? 'Your Mark'
                        : 'Key'}
                  </span>
                </div>

                {/* Question Rows */}
                <div className="divide-y divide-slate-800/80">
                  {colQuestions.map((qNum) => {
                    const isFocused = activeQuestion === qNum;
                    const studentChoice = sheet.responses[qNum] ?? null;
                    const keyChoice = sheet.answerKey[qNum] ?? null;
                    const evaluation = gradeSummary.evaluations[qNum];
                    const status: QuestionEvaluationStatus = evaluation?.status ?? 'unkeyed';

                    // Row styling based on stage & evaluation status
                    let rowBgClass = 'bg-[#0B1120] hover:bg-slate-800/40';
                    if (sheet.stage === 'graded') {
                      if (status === 'correct') {
                        rowBgClass = 'bg-emerald-950/35 hover:bg-emerald-950/50';
                      } else if (status === 'wrong') {
                        rowBgClass = 'bg-rose-950/35 hover:bg-rose-950/50';
                      } else if (status === 'unanswered') {
                        rowBgClass = 'bg-amber-950/20 hover:bg-amber-950/35';
                      }
                    } else if (isFocused) {
                      rowBgClass =
                        sheet.stage === 'filling_key'
                          ? 'bg-amber-950/30 ring-1 ring-inset ring-amber-400/70'
                          : 'bg-sky-950/35 ring-1 ring-inset ring-sky-400/70';
                    }

                    return (
                      <div
                        key={qNum}
                        ref={(el) => {
                          rowRefs.current[qNum] = el;
                        }}
                        onClick={() => setActiveQuestion(qNum)}
                        className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${rowBgClass}`}
                      >
                        {/* Left Timing Track Mark + Question Number */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`w-2 h-1.5 rounded-xs shrink-0 ${
                              isFocused
                                ? sheet.stage === 'filling_key'
                                  ? 'bg-amber-400'
                                  : 'bg-sky-400'
                                : 'bg-slate-700'
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`font-mono text-xs font-bold tabular-nums w-7 ${
                              isFocused
                                ? sheet.stage === 'filling_key'
                                  ? 'text-amber-300 underline'
                                  : 'text-sky-300 underline'
                                : 'text-slate-300'
                            }`}
                          >
                            {String(qNum).padStart(2, '0')}.
                          </span>
                        </div>

                        {/* OMR Bubbles Row */}
                        <div className="flex items-center gap-2">
                          {Array.from({ length: sheet.optionsCount }).map((_, optIdx) => {
                            const letter = getOptionLabel(optIdx);
                            const numKey = optIdx + 1;

                            // Determine visual state of this bubble in each of the 3 modes
                            let bubbleClass =
                              'bg-[#090D16] text-slate-300 border-slate-700 hover:border-slate-400 hover:text-white';
                            let bubbleContent: React.ReactNode = (
                              <span className="flex flex-col items-center leading-none">
                                <span className="text-xs font-bold">{letter}</span>
                                <span className="text-[9px] opacity-65">{numKey}</span>
                              </span>
                            );

                            if (sheet.stage === 'filling_responses') {
                              const isSelected = studentChoice === optIdx;
                              if (isSelected) {
                                bubbleClass =
                                  'bg-sky-400 text-slate-950 border-sky-300 scale-[1.04]';
                              }
                            } else if (sheet.stage === 'filling_key') {
                              const isKeySelected = keyChoice === optIdx;
                              const isStudentSelected =
                                showOriginalInKeyMode && studentChoice === optIdx;

                              if (isKeySelected) {
                                bubbleClass =
                                  'bg-amber-400 text-slate-950 border-amber-300 scale-[1.04]';
                              } else if (isStudentSelected) {
                                bubbleClass =
                                  'bg-slate-800/90 text-sky-300 border-sky-500/60 border-dashed';
                              }
                            } else if (sheet.stage === 'graded') {
                              const isStudentMarked = studentChoice === optIdx;
                              const isCorrectKey = keyChoice === optIdx;

                              if (isStudentMarked && isCorrectKey) {
                                // Student marked this bubble AND it matches the Answer Key -> Solid Green
                                bubbleClass =
                                  'bg-emerald-500 text-slate-950 border-emerald-400';
                                bubbleContent = (
                                  <span className="flex flex-col items-center leading-none">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span className="text-[9px] font-bold">{letter}</span>
                                  </span>
                                );
                              } else if (isStudentMarked && !isCorrectKey) {
                                // Student marked this bubble AND it is WRONG -> Solid Red
                                bubbleClass = 'bg-rose-500 text-white border-rose-400';
                                bubbleContent = (
                                  <span className="flex flex-col items-center leading-none">
                                    <X className="w-3.5 h-3.5 stroke-[3]" />
                                    <span className="text-[9px] font-bold">{letter}</span>
                                  </span>
                                );
                              } else if (!isStudentMarked && isCorrectKey) {
                                // Student did NOT mark this, but this is the true Answer Key -> Highlighted Green Ring
                                bubbleClass =
                                  'bg-emerald-950/90 text-emerald-300 border-emerald-400 ring-2 ring-emerald-500/40 font-bold';
                              } else {
                                bubbleClass = 'bg-[#090D16]/60 text-slate-600 border-slate-800';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (sheet.stage === 'graded') {
                                    setActiveQuestion(qNum);
                                    return;
                                  }
                                  handleSelectBubble(qNum, optIdx, 'click');
                                }}
                                aria-label={`Question ${qNum} Option ${letter} (Key ${numKey})`}
                                className={`w-10 h-10 rounded-full border-2 font-mono flex items-center justify-center transition-all cursor-pointer select-none shrink-0 ${bubbleClass}`}
                              >
                                {bubbleContent}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Status / Indicator Column */}
                        <div className="w-16 text-right font-mono text-[11px] tabular-nums shrink-0">
                          {sheet.stage === 'filling_responses' && (
                            <span className="text-slate-500">
                              {studentChoice !== null ? (
                                <strong className="text-sky-300">
                                  {getOptionLabel(studentChoice)} ({studentChoice + 1})
                                </strong>
                              ) : (
                                '—'
                              )}
                            </span>
                          )}

                          {sheet.stage === 'filling_key' && (
                            <span className="text-slate-400">
                              {showOriginalInKeyMode ? (
                                studentChoice !== null ? (
                                  <span title="Your original marked option">
                                    You: {getOptionLabel(studentChoice)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Skip</span>
                                )
                              ) : keyChoice !== null ? (
                                <strong className="text-amber-300">
                                  Key: {getOptionLabel(keyChoice)}
                                </strong>
                              ) : (
                                '—'
                              )}
                            </span>
                          )}

                          {sheet.stage === 'graded' && (
                            <>
                              {status === 'correct' && (
                                <span className="font-bold text-emerald-400">
                                  ✓ +{sheet.scoringRule.correctPoints}
                                </span>
                              )}
                              {status === 'wrong' && (
                                <span
                                  className="font-bold text-rose-400"
                                  title={`You marked ${
                                    studentChoice !== null ? getOptionLabel(studentChoice) : 'none'
                                  }, Answer Key is ${
                                    keyChoice !== null ? getOptionLabel(keyChoice) : '?'
                                  }`}
                                >
                                  ✕ Key:{keyChoice !== null ? getOptionLabel(keyChoice) : '?'}
                                </span>
                              )}
                              {status === 'unanswered' && (
                                <span className="font-semibold text-amber-400">
                                  ○ Key:{keyChoice !== null ? getOptionLabel(keyChoice) : '?'}
                                </span>
                              )}
                              {status === 'unkeyed' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStageChange('filling_key');
                                    setActiveQuestion(qNum);
                                  }}
                                  className="text-amber-400 underline hover:text-amber-300 cursor-pointer"
                                >
                                  Set Key
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Sheet Completion Footer Bar */}
        <div className="px-6 py-4 bg-[#0B1120] border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            <span>
              Student Bubbles: <strong className="text-slate-200">{gradeSummary.answeredCount}</strong>/
              {sheet.questionCount}
            </span>
            <span className="mx-2 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>
              Answer Key Bubbles:{' '}
              <strong className="text-slate-200">{gradeSummary.keyFilledCount}</strong>/
              {sheet.questionCount}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sheet.stage === 'filling_responses' && (
              <button
                type="button"
                onClick={() => handleStageChange('filling_key')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Finish Sheet & Fill Answer Key OMR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {sheet.stage === 'filling_key' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStageChange('filling_responses')}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Back to Student OMR
                </button>
                <button
                  type="button"
                  onClick={() => handleStageChange('graded')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Show Graded Original OMR (Green & Red)</span>
                </button>
              </>
            )}

            {sheet.stage === 'graded' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStageChange('filling_key')}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Edit Answer Key Bubbles
                </button>
                <button
                  type="button"
                  onClick={() => handleStageChange('filling_responses')}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Edit Student Bubbles
                </button>
                <button
                  type="button"
                  onClick={onCreateNewRequest}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Create New OMR Sheet
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
