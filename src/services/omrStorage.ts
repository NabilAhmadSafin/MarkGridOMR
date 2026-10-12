import { OMRSheet, evaluateOMRSheet, getOptionLabel } from '../types/omr';

const DB_NAME = 'markgrid_omr_db';
const DB_VERSION = 1;
const STORE_NAME = 'omr_sheets';
const SEED_FLAG_KEY = 'markgrid_seeded_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function getAllSheets(): Promise<OMRSheet[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = (request.result as OMRSheet[]) || [];
      result.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSheetById(id: string): Promise<OMRSheet | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as OMRSheet | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSheet(sheet: OMRSheet): Promise<OMRSheet> {
  const db = await openDatabase();
  const updated: OMRSheet = {
    ...sheet,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMultipleSheets(sheets: OMRSheet[]): Promise<number> {
  if (sheets.length === 0) return 0;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const sheet of sheets) {
      store.put(sheet);
    }

    tx.oncomplete = () => resolve(sheets.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSheet(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllSheets(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function ensureSeedSheetsIfEmpty(): Promise<OMRSheet[]> {
  const existing = await getAllSheets();
  if (existing.length > 0 || localStorage.getItem(SEED_FLAG_KEY) === 'true') {
    return existing;
  }

  const now = Date.now();
  const sampleGraded: OMRSheet = {
    id: 'sample-biochem-20',
    title: 'Molecular Biology Diagnostic — Set A',
    subject: 'Biochemistry & Genetics',
    questionCount: 20,
    optionsCount: 4,
    responses: {
      1: 0, 2: 2, 3: 1, 4: 3, 5: 0,
      6: 1, 7: 2, 8: 0, 9: 3, 10: 1,
      11: 2, 12: 2, 13: 0, 14: 1, 15: 3,
      16: 0, 17: 2, 18: 1, 19: null, 20: 3,
    },
    answerKey: {
      1: 0, 2: 2, 3: 1, 4: 2, 5: 0,
      6: 1, 7: 3, 8: 0, 9: 3, 10: 1,
      11: 2, 12: 0, 13: 0, 14: 1, 15: 3,
      16: 0, 17: 2, 18: 1, 19: 1, 20: 3,
    },
    stage: 'graded',
    scoringRule: {
      correctPoints: 1,
      wrongPoints: 0,
      unansweredPoints: 0,
    },
    createdAt: now - 3600 * 1000 * 5,
    updatedAt: now - 3600 * 1000 * 2,
    durationSeconds: 412,
  };

  const sampleInProgress: OMRSheet = {
    id: 'sample-physics-15',
    title: 'Classical Mechanics Practice Quiz',
    subject: 'Physics 101',
    questionCount: 15,
    optionsCount: 4,
    responses: {
      1: 1, 2: 0, 3: 3, 4: 2, 5: 1,
      6: 0, 7: 2, 8: 1, 9: null, 10: null,
      11: null, 12: null, 13: null, 14: null, 15: null,
    },
    answerKey: {},
    stage: 'filling_responses',
    scoringRule: {
      correctPoints: 4,
      wrongPoints: -1,
      unansweredPoints: 0,
    },
    createdAt: now - 3600 * 1000 * 24,
    updatedAt: now - 3600 * 1000 * 12,
    durationSeconds: 185,
  };

  await saveMultipleSheets([sampleGraded, sampleInProgress]);
  localStorage.setItem(SEED_FLAG_KEY, 'true');
  return getAllSheets();
}

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'omr-sheet'
  );
}

function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSheetAsJSON(sheet: OMRSheet): void {
  const payload = {
    format: 'markgrid-omr-v1',
    exportedAt: new Date().toISOString(),
    sheets: [sheet],
  };
  const filename = `${sanitizeFilename(sheet.title)}-${sheet.questionCount}q.json`;
  triggerFileDownload(JSON.stringify(payload, null, 2), filename, 'application/json');
}

export function exportAllSheetsAsJSON(sheets: OMRSheet[]): void {
  const datePart = new Date().toISOString().slice(0, 10);
  const payload = {
    format: 'markgrid-omr-v1',
    exportedAt: new Date().toISOString(),
    sheetCount: sheets.length,
    sheets,
  };
  const filename = `markgrid-omr-backup-${datePart}.json`;
  triggerFileDownload(JSON.stringify(payload, null, 2), filename, 'application/json');
}

export function exportSheetAsCSV(sheet: OMRSheet): void {
  const summary = evaluateOMRSheet(sheet);
  const rows: string[][] = [
    [
      'Question',
      'Marked_Number_Key',
      'Marked_Option',
      'Answer_Key_Number',
      'Answer_Key_Option',
      'Evaluation_Status',
      'Points_Awarded',
    ],
  ];

  for (let q = 1; q <= sheet.questionCount; q++) {
    const ev = summary.evaluations[q];
    const studentNum = ev.studentOption !== null ? String(ev.studentOption + 1) : '';
    const studentLet = ev.studentOption !== null ? getOptionLabel(ev.studentOption) : 'UNMARKED';
    const keyNum = ev.keyOption !== null ? String(ev.keyOption + 1) : '';
    const keyLet = ev.keyOption !== null ? getOptionLabel(ev.keyOption) : 'UNKEYED';

    rows.push([
      String(q),
      studentNum,
      studentLet,
      keyNum,
      keyLet,
      ev.status.toUpperCase(),
      String(ev.pointsAwarded),
    ]);
  }

  rows.push([]);
  rows.push(['Summary Metric', 'Value']);
  rows.push(['Sheet Title', `"${sheet.title.replace(/"/g, '""')}"`]);
  rows.push(['Total Questions', String(summary.totalQuestions)]);
  rows.push(['Answered', String(summary.answeredCount)]);
  rows.push(['Correct', String(summary.correctCount)]);
  rows.push(['Wrong', String(summary.wrongCount)]);
  rows.push(['Skipped / Unanswered', String(summary.unansweredCount)]);
  rows.push(['Total Score', `${summary.totalScore} / ${summary.maxScore}`]);
  rows.push(['Percentage', `${summary.percentage}%`]);

  const csvContent = rows.map((r) => r.join(',')).join('\n');
  const filename = `${sanitizeFilename(sheet.title)}-report.csv`;
  triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

function normalizeSingleSheet(raw: unknown, index: number): OMRSheet {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid sheet object at index ${index}`);
  }
  const obj = raw as Record<string, unknown>;
  const questionCount = Number(obj.questionCount);
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 500) {
    throw new Error(
      `Invalid questionCount (${String(obj.questionCount)}) in sheet at index ${index}. Must be between 1 and 500.`
    );
  }

  const optionsCount = obj.optionsCount === 5 ? 5 : 4;
  const stage =
    obj.stage === 'filling_key' || obj.stage === 'graded' ? obj.stage : 'filling_responses';

  const normalizeMap = (input: unknown): Record<number, number | null> => {
    const out: Record<number, number | null> = {};
    if (input && typeof input === 'object') {
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        const qNum = Number(k);
        if (Number.isInteger(qNum) && qNum >= 1 && qNum <= questionCount) {
          if (v === null || v === undefined) {
            out[qNum] = null;
          } else {
            const opt = Number(v);
            if (Number.isInteger(opt) && opt >= 0 && opt < optionsCount) {
              out[qNum] = opt;
            }
          }
        }
      }
    }
    return out;
  };

  const rawRule = (obj.scoringRule as Record<string, unknown>) || {};
  const scoringRule = {
    correctPoints:
      typeof rawRule.correctPoints === 'number' && !Number.isNaN(rawRule.correctPoints)
        ? rawRule.correctPoints
        : 1,
    wrongPoints:
      typeof rawRule.wrongPoints === 'number' && !Number.isNaN(rawRule.wrongPoints)
        ? rawRule.wrongPoints
        : 0,
    unansweredPoints:
      typeof rawRule.unansweredPoints === 'number' && !Number.isNaN(rawRule.unansweredPoints)
        ? rawRule.unansweredPoints
        : 0,
  };

  const now = Date.now();
  return {
    id:
      typeof obj.id === 'string' && obj.id.trim().length > 0
        ? obj.id.trim()
        : `imported-${now}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title:
      typeof obj.title === 'string' && obj.title.trim().length > 0
        ? obj.title.trim()
        : `Imported OMR Sheet (${questionCount}Q)`,
    subject:
      typeof obj.subject === 'string' && obj.subject.trim().length > 0
        ? obj.subject.trim()
        : 'General Assessment',
    questionCount,
    optionsCount,
    responses: normalizeMap(obj.responses),
    answerKey: normalizeMap(obj.answerKey),
    stage,
    scoringRule,
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : now,
    durationSeconds: typeof obj.durationSeconds === 'number' ? obj.durationSeconds : 0,
  };
}

export function parseImportedJSON(rawText: string): OMRSheet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('The JSON array contains no OMR sheets.');
    }
    return parsed.map((item, idx) => normalizeSingleSheet(item, idx));
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.sheets)) {
      if (obj.sheets.length === 0) {
        throw new Error('The backup file contains 0 sheets.');
      }
      return obj.sheets.map((item, idx) => normalizeSingleSheet(item, idx));
    }
    if ('questionCount' in obj) {
      return [normalizeSingleSheet(obj, 0)];
    }
  }

  throw new Error(
    'Unrecognized OMR JSON structure. Expected a MarkGrid OMR export file or sheet object.'
  );
}
