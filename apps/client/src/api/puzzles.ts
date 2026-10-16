/**
 * M4 — Puzzle API integration seam for the FUTURE puzzle service.
 *
 * The puzzle service is a SEPARATE API from the PikPok app API
 * (`EXPO_PUBLIC_API_URL`, see client.ts). This module is the single client-side
 * boundary with it:
 *
 *   - GET  `${PUZZLE_API_BASE_URL}/puzzles?limit=<n>`  → PuzzleFeed (fetch cards)
 *   - POST `${PUZZLE_API_BASE_URL}/puzzles/answer`     → AnswerResult (submit an answer)
 *
 * Auth is sent as `Authorization: Bearer <token>` — an ASSUMPTION the future
 * service must honor (or replace) its own auth scheme. The wire contract is
 * camelCase JSON (an assumption the future service must honor).
 *
 * NO puzzle logic lives in the client: no puzzle generation, no answer
 * checking, no correct-answer computation. The service owns all of that —
 * `PuzzleCard` deliberately never carries an `answer` field.
 *
 * Configuration: `EXPO_PUBLIC_PUZZLE_API_URL` (see .env.example). When it is
 * empty/unset (the expected state until the service exists),
 * `isPuzzleServiceConfigured` is false and both functions throw a typed
 * `ApiError` (status 0, code PUZZLE_SERVICE_UNAVAILABLE) WITHOUT making any
 * network call.
 *
 * Reuses `ApiError` and the `{ error: { code, message } }` envelope parsing
 * from client.ts so error handling stays consistent app-wide.
 */
import { ApiError, toApiError } from './client';

// NOTE: must be a static `process.env.EXPO_PUBLIC_*` dot-reference so Metro can
// inline it into the bundle at build time.
const RAW_PUZZLE_API_URL = process.env.EXPO_PUBLIC_PUZZLE_API_URL;

/** Base URL of the future puzzle service, trimmed, no trailing slash.
 *  Empty string when the service is not configured. */
export const PUZZLE_API_BASE_URL = (RAW_PUZZLE_API_URL ?? '').trim().replace(/\/+$/, '');

/** True only when `PUZZLE_API_BASE_URL` is non-empty. */
export const isPuzzleServiceConfigured = PUZZLE_API_BASE_URL.length > 0;

const PUZZLE_SERVICE_UNAVAILABLE_CODE = 'PUZZLE_SERVICE_UNAVAILABLE';
const PUZZLE_SERVICE_UNAVAILABLE_MESSAGE = 'The puzzle service is not connected yet.';

// Mirrors client.ts: aborts requests that hang longer than this.
const REQUEST_TIMEOUT_MS = 15000;

// Feed paging defaults for `fetchPuzzleFeed`.
const DEFAULT_FEED_LIMIT = 20;
const MIN_FEED_LIMIT = 1;
const MAX_FEED_LIMIT = 50;

// ---------------------------------------------------------------------------
// Types — the written wire contract with the future service (camelCase JSON).
// ---------------------------------------------------------------------------

export type PuzzleKind = 'math' | 'logic' | 'pattern' | 'words' | 'memory' | 'reaction';

/** A puzzle card as served by the future puzzle service.
 *  `difficulty` is 1..5 (shown to the user as LVL).
 *  `choices` is present only for multiple-choice puzzles.
 *  Deliberately NEVER includes an `answer` field — the client must not know it. */
export interface PuzzleCard {
  id: string;
  prompt: string;
  kind: PuzzleKind;
  difficulty: number;
  choices?: string[];
}

export interface PuzzleFeed {
  cards: PuzzleCard[];
  nextCursor?: string | null;
}

export interface AnswerSubmission {
  cardId: string;
  answer: string;
  durationMs?: number;
}

export interface AnswerResult {
  correct: boolean;
  xpAwarded: number;
  correctAnswer?: string;
  streakAfter?: number;
}

// ---------------------------------------------------------------------------
// Transport — mirrors client.ts's `request()` but targets PUZZLE_API_BASE_URL.
// ---------------------------------------------------------------------------

interface PuzzleRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Bearer token; the puzzle service is expected to require it. */
  token?: string;
}

async function puzzleRequest<T>(path: string, options: PuzzleRequestOptions = {}): Promise<T> {
  // Unconfigured short-circuit: fail fast with a typed error and NO network call.
  if (!isPuzzleServiceConfigured) {
    throw new ApiError(0, PUZZLE_SERVICE_UNAVAILABLE_CODE, PUZZLE_SERVICE_UNAVAILABLE_MESSAGE);
  }

  const { method = 'GET', body, token } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${PUZZLE_API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // fetch rejects on DNS/connection failures and on our timeout abort.
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the puzzle service. Check your connection and try again.'
    );
  } finally {
    clearTimeout(timeout);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (e.g. empty 204) — leave data null.
  }

  if (!response.ok) {
    // Same envelope parsing as client.ts (shared helper).
    throw toApiError(response.status, data, `Puzzle request failed with status ${response.status}.`);
  }

  return data as T;
}

/** Clamps to the contract's page size: default 20, always within 1..50. */
function clampFeedLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_FEED_LIMIT;
  return Math.min(MAX_FEED_LIMIT, Math.max(MIN_FEED_LIMIT, Math.floor(limit)));
}

// ---------------------------------------------------------------------------
// The two integration points.
// ---------------------------------------------------------------------------

/**
 * GET /puzzles?limit=<n> (Bearer) → 200 PuzzleFeed.
 *
 * Throws `ApiError`:
 *  - status 0 / PUZZLE_SERVICE_UNAVAILABLE when the service isn't configured;
 *  - status 0 / NETWORK_ERROR on connection failure or timeout;
 *  - the server's status + envelope code otherwise.
 */
export async function fetchPuzzleFeed(token: string, limit?: number): Promise<PuzzleFeed> {
  const data = await puzzleRequest<PuzzleFeed>(`/puzzles?limit=${clampFeedLimit(limit)}`, {
    token,
  });
  // Defensive unwrap (mirrors client.ts style): tolerate a missing `cards` array.
  return {
    cards: Array.isArray(data?.cards) ? data.cards : [],
    nextCursor: data?.nextCursor ?? null,
  };
}

/**
 * POST /puzzles/answer (Bearer, JSON body = submission) → 200 AnswerResult.
 *
 * NOTE: no answer UI exists yet — the future answer UI will call this. The
 * client never validates the answer locally; the service decides correctness.
 *
 * Throws `ApiError` with the same codes as `fetchPuzzleFeed`.
 */
export async function submitPuzzleAnswer(
  token: string,
  submission: AnswerSubmission
): Promise<AnswerResult> {
  return puzzleRequest<AnswerResult>('/puzzles/answer', {
    method: 'POST',
    body: submission,
    token,
  });
}
