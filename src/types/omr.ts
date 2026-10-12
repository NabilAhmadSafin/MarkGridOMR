export type OMRStage = 'filling_responses' | 'filling_key' | 'graded';

export interface ScoringRule {
  correctPoints: number;
  wrongPoints: number;
  unansweredPoints: number;
}

export interface OMRSheet {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  optionsCount: 4 | 5;
  /**
   * 1-indexed question number -> 0-indexed option (0 = Circle 1 / A, 1 = Circle 2 / B, etc.) or null
   */
  responses: Record<number, number | null>;
  /**
   * 1-indexed question number -> 0-indexed correct option (0 = Circle 1 / A, 1 = Circle 2 / B, etc.) or null
   */
  answerKey: Record<number, number | null>;
  stage: OMRStage;
  scoringRule: ScoringRule;
  createdAt: number;
  updatedAt: number;
  durationSeconds?: number;
}

export type QuestionEvaluationStatus = 'correct' | 'wrong' | 'unanswered' | 'unkeyed';

export interface QuestionEvaluation {
  questionNumber: number;
  studentOption: number | null;
  keyOption: number | null;
  status: QuestionEvaluationStatus;
  pointsAwarded: number;
}

export interface OMRGradeSummary {
  totalQuestions: number;
  answeredCount: number;
  keyFilledCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  unkeyedCount: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  accuracyOfAttempted: number;
  evaluations: Record<number, QuestionEvaluation>;
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export function getOptionLabel(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

export function evaluateOMRSheet(sheet: OMRSheet): OMRGradeSummary {
  const { questionCount, responses, answerKey, scoringRule } = sheet;
  let answeredCount = 0;
  let keyFilledCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let unkeyedCount = 0;
  let totalScore = 0;

  const evaluations: Record<number, QuestionEvaluation> = {};

  for (let q = 1; q <= questionCount; q++) {
    const studentOption = responses[q] ?? null;
    const keyOption = answerKey[q] ?? null;

    if (studentOption !== null && studentOption !== undefined) {
      answeredCount++;
    }
    if (keyOption !== null && keyOption !== undefined) {
      keyFilledCount++;
    }

    let status: QuestionEvaluationStatus = 'unkeyed';
    let pointsAwarded = 0;

    if (keyOption === null || keyOption === undefined) {
      status = 'unkeyed';
      unkeyedCount++;
      pointsAwarded = 0;
    } else if (studentOption === null || studentOption === undefined) {
      status = 'unanswered';
      unansweredCount++;
      pointsAwarded = scoringRule.unansweredPoints;
    } else if (studentOption === keyOption) {
      status = 'correct';
      correctCount++;
      pointsAwarded = scoringRule.correctPoints;
    } else {
      status = 'wrong';
      wrongCount++;
      pointsAwarded = scoringRule.wrongPoints;
    }

    totalScore += pointsAwarded;
    evaluations[q] = {
      questionNumber: q,
      studentOption,
      keyOption,
      status,
      pointsAwarded,
    };
  }

  // Round score to 2 decimals to avoid floating point precision artifacts
  totalScore = Math.round(totalScore * 100) / 100;
  const effectiveGradableCount = keyFilledCount > 0 ? keyFilledCount : questionCount;
  const maxScore = Math.round(effectiveGradableCount * scoringRule.correctPoints * 100) / 100;
  const percentage =
    maxScore > 0 ? Math.max(0, Math.round((totalScore / maxScore) * 1000) / 10) : 0;
  const gradedAttempts = correctCount + wrongCount;
  const accuracyOfAttempted =
    gradedAttempts > 0 ? Math.round((correctCount / gradedAttempts) * 1000) / 10 : 0;

  return {
    totalQuestions: questionCount,
    answeredCount,
    keyFilledCount,
    correctCount,
    wrongCount,
    unansweredCount,
    unkeyedCount,
    totalScore,
    maxScore,
    percentage,
    accuracyOfAttempted,
    evaluations,
  };
}
