/**
 * Shared puzzle-feed types (M5) — the locked wire contract between the API
 * and the client. These describe EXACTLY what goes over the wire; cards must
 * never carry the answer, solution data or raw source JSON.
 */

export type PuzzleDomain = 'math' | 'logic' | 'pattern' | 'words';

export type PuzzleDifficultyLevel = 1 | 3 | 5;

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

/** One feed card: payload of GET /puzzles cards. */
export interface PuzzleCard {
  id: string;
  domain: PuzzleDomain;
  difficulty: PuzzleDifficultyLevel;
  title: string;
  prompt: string;
  /** RELATIVE public path; the client prefixes its API base URL. */
  imageUrl: string;
  hints: string[];
}

/** Feed envelope of GET /puzzles. */
export interface PuzzleFeed {
  cards: PuzzleCard[];
  /** Next offset as a string, or null when the feed is exhausted. */
  nextCursor: string | null;
}

/** GET /puzzles/daily response body. */
export interface DailyResult {
  /** UTC calendar date (YYYY-MM-DD) this featured puzzle belongs to. */
  dailyDate: string;
  /** Same card shape as GET /puzzles — never carries the answer. */
  card: PuzzleCard;
  /** True when `users.last_daily_solve_at` is today (UTC), i.e. already credited. */
  solvedToday: boolean;
  /** The crediting solve instant, ISO-8601; null while today is unsolved. */
  solvedAt: string | null;
  /** ISO-8601 instant of the next 00:00 UTC rotation. */
  nextResetAt: string;
}

/** POST /puzzles/:id/answer response body. */
export interface AnswerResult {
  correct: boolean;
  xpAwarded: number;
  xpTotal: number;
  streak: number;
  /** Level of the submitting user, computed from post-submission XP (M6). */
  level: number;
  /** Successfully-solved puzzle count AFTER this submission (M6). */
  solvedCount: number;
  /** ONLY present when the submission was incorrect. */
  correctAnswer?: string;
}
