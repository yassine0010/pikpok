/**
 * M5 — Puzzle feed + answer API client.
 *
 * Puzzles are served by the MAIN PikPok API (`API_BASE_URL`, see client.ts) —
 * the old "separate puzzle service" seam (`EXPO_PUBLIC_PUZZLE_API_URL`) is gone.
 * This module is the single source of truth for the puzzle wire contract:
 *
 *   - GET  /puzzles?limit=<1..50, default 20>&cursor=<int offset string>
 *                                                          → PuzzleFeed
 *   - POST /puzzles/:id/answer (Bearer, { answer, durationMs? }) → AnswerResult
 *   - GET  /puzzles/daily (Bearer) → DailyPuzzle (M7 — featured puzzle of the
 *          UTC day + the caller's solve status for it)
 *
 * Auth is sent as `Authorization: Bearer <token>` — the same main-API session
 * token used by every other endpoint.
 *
 * NO puzzle logic lives in the client: no puzzle generation, no answer
 * checking. The server decides correctness — `PuzzleCard` deliberately never
 * carries an `answer` field, and repeat solves simply return
 * `correct=true, xpAwarded=0`.
 *
 * Reuses `ApiError` / `toApiError` / `API_BASE_URL` from client.ts so error
 * handling stays consistent app-wide. The transport mirrors client.ts's
 * `request()` (that one stays private to client.ts; `request()` is not
 * exported and its behavior is unchanged).
 */
import { API_BASE_URL, ApiError, toApiError } from './client';

// Mirrors client.ts: aborts requests that hang longer than this.
const REQUEST_TIMEOUT_MS = 15000;

// Feed paging defaults for `fetchPuzzleFeed`.
const DEFAULT_FEED_LIMIT = 20;
const MIN_FEED_LIMIT = 1;
const MAX_FEED_LIMIT = 50;

// ---------------------------------------------------------------------------
// Types — the written wire contract with the main API (camelCase JSON).
// ---------------------------------------------------------------------------

export type PuzzleDomain = 'math' | 'logic' | 'pattern' | 'words';

/** A puzzle card as served by the main API.
 *  `difficulty` is 1 / 3 / 5 (shown to the user as LVL).
 *  `imageUrl` is RELATIVE — always render it through `puzzleImageUrl()`.
 *  `hints` holds 2–3 progressive strings, revealed one at a time in the UI.
 *  Deliberately NEVER includes an `answer` field — the client must not know it. */
export interface PuzzleCard {
  id: string;
  domain: PuzzleDomain;
  difficulty: 1 | 3 | 5;
  title: string;
  /** The question shown to the user; may contain newlines. */
  prompt: string;
  /** Relative URL — prefix with `API_BASE_URL` via `puzzleImageUrl()`. */
  imageUrl: string;
  hints: string[];
}

export interface PuzzleFeed {
  cards: PuzzleCard[];
  /** Offset cursor for the next page; `null` when there are no more cards. */
  nextCursor: string | null;
}

export interface AnswerSubmission {
  answer: string;
  durationMs?: number;
}

export interface AnswerResult {
  correct: boolean;
  xpAwarded: number;
  xpTotal: number;
  streak: number;
  /** M6 — authoritative totals echoed on every answer (correct, incorrect and
   * repeat solves alike), so the client can sync its signed-in user state. */
  level: number;
  solvedCount: number;
  /** Present only when `correct` is false — the expected answer, for feedback. */
  correctAnswer?: string;
}

/** M7 — GET /puzzles/daily response: the featured puzzle of the UTC day plus
 * the signed-in user's solve status for it. `card` uses the exact feed-card
 * wire shape (deliberately never carries an answer field). */
export interface DailyPuzzle {
  /** UTC date the featured puzzle belongs to, 'YYYY-MM-DD'. */
  dailyDate: string;
  /** The featured puzzle — same shape as a feed card. */
  card: PuzzleCard;
  /** True once the signed-in user has solved today's featured puzzle. */
  solvedToday: boolean;
  /** ISO instant of the solve; `null` while `solvedToday` is false. */
  solvedAt: string | null;
  /** ISO instant of the next 00:00 UTC reset. */
  nextResetAt: string;
}

// ---------------------------------------------------------------------------
// Defensive normalizers — mirror client.ts style: coerce contract fields,
// drop anything extra. The server is the only source of puzzle truth.
// ---------------------------------------------------------------------------

const DOMAIN_VALUES: readonly PuzzleDomain[] = ['math', 'logic', 'pattern', 'words'];
const DIFFICULTY_VALUES: readonly (1 | 3 | 5)[] = [1, 3, 5];

function normalizeDomain(raw: unknown): PuzzleDomain {
  return DOMAIN_VALUES.includes(raw as PuzzleDomain) ? (raw as PuzzleDomain) : 'logic';
}

function normalizeDifficulty(raw: unknown): 1 | 3 | 5 {
  const value = Number(raw);
  return DIFFICULTY_VALUES.includes(value as 1 | 3 | 5) ? (value as 1 | 3 | 5) : 1;
}

function normalizePuzzleCard(raw: Partial<PuzzleCard> | null | undefined): PuzzleCard {
  return {
    id: String(raw?.id ?? ''),
    domain: normalizeDomain(raw?.domain),
    difficulty: normalizeDifficulty(raw?.difficulty),
    title: String(raw?.title ?? ''),
    prompt: String(raw?.prompt ?? ''),
    imageUrl: String(raw?.imageUrl ?? ''),
    hints: Array.isArray(raw?.hints) ? raw.hints.map((hint) => String(hint)) : [],
  };
}

/** Coerces a contract field to a finite number with a fallback (rejects NaN
 * from things like `Number('abc')` — mirrors the `Number.isFinite` guards used
 * for feed params below). */
function normalizeFiniteNumber(raw: unknown, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeAnswerResult(raw: Partial<AnswerResult> | null | undefined): AnswerResult {
  return {
    correct: Boolean(raw?.correct),
    xpAwarded: normalizeFiniteNumber(raw?.xpAwarded, 0),
    xpTotal: normalizeFiniteNumber(raw?.xpTotal, 0),
    streak: normalizeFiniteNumber(raw?.streak, 0),
    level: normalizeFiniteNumber(raw?.level, 1),
    solvedCount: normalizeFiniteNumber(raw?.solvedCount, 0),
    correctAnswer:
      typeof raw?.correctAnswer === 'string' && raw.correctAnswer.length > 0
        ? raw.correctAnswer
        : undefined,
  };
}

/** Builds an absolute image URL from a card's relative `imageUrl`.
 *  Accepts either a `PuzzleCard` or a raw relative/absolute URL string.
 *  Absolute URLs pass through untouched; relative ones get `API_BASE_URL`. */
export function puzzleImageUrl(card: PuzzleCard): string;
export function puzzleImageUrl(relativeUrl: string): string;
export function puzzleImageUrl(source: PuzzleCard | string): string {
  const relative = typeof source === 'string' ? source : source?.imageUrl ?? '';
  if (!relative) return '';
  if (/^https?:\/\//i.test(relative)) return relative; // already absolute
  return `${API_BASE_URL}/${relative.replace(/^\/+/, '')}`;
}

// ---------------------------------------------------------------------------
// Transport — mirrors client.ts's `request()` but targets API_BASE_URL with an
// explicit token argument (the puzzle endpoints always require a Bearer token).
// ---------------------------------------------------------------------------

interface PuzzleRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Bearer token; the puzzle endpoints require the main API session token. */
  token: string;
}

async function puzzleRequest<T>(path: string, options: PuzzleRequestOptions): Promise<T> {
  const { method = 'GET', body, token } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // fetch rejects on DNS/connection failures and on our timeout abort.
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
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
 * GET /puzzles?limit=<n>&cursor=<offset> (Bearer) → 200 PuzzleFeed.
 *
 * `opts.cursor` alone already requests the NEXT page (the server treats it as
 * an integer offset); pass it straight from the previous response's
 * `nextCursor`. Throws `ApiError`:
 *  - status 0 / NETWORK_ERROR on connection failure or timeout;
 *  - the server's status + envelope code otherwise (400 / 401 / 404 …).
 */
export async function fetchPuzzleFeed(
  token: string,
  opts?: { limit?: number; cursor?: string }
): Promise<PuzzleFeed> {
  const params = new URLSearchParams({ limit: String(clampFeedLimit(opts?.limit)) });
  // Only forward well-formed numeric cursor strings; anything else falls back
  // to the first page rather than surfacing a server VALIDATION_ERROR.
  if (opts?.cursor && /^\d+$/.test(opts.cursor.trim())) {
    params.set('cursor', opts.cursor.trim());
  }
  const data = await puzzleRequest<PuzzleFeed>(`/puzzles?${params.toString()}`, { token });
  // Defensive unwrap (mirrors client.ts style): tolerate a missing `cards`.
  return {
    cards: Array.isArray(data?.cards) ? data.cards.map(normalizePuzzleCard) : [],
    nextCursor: typeof data?.nextCursor === 'string' && data.nextCursor.length > 0 ? data.nextCursor : null,
  };
}

/**
 * POST /puzzles/:id/answer (Bearer, { answer, durationMs? }) → 200 AnswerResult.
 *
 * The client never validates the answer locally; the server decides
 * correctness. Repeat solves of the same card return `correct=true,
 * xpAwarded=0`, so resubmitting is safe.
 *
 * Throws `ApiError` with the same codes as `fetchPuzzleFeed`.
 */
export async function submitPuzzleAnswer(
  token: string,
  cardId: string,
  answer: string,
  durationMs?: number
): Promise<AnswerResult> {
  const submission: AnswerSubmission = { answer };
  if (typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0) {
    submission.durationMs = Math.round(durationMs);
  }
  const data = await puzzleRequest<AnswerResult>(`/puzzles/${encodeURIComponent(cardId)}/answer`, {
    method: 'POST',
    body: submission,
    token,
  });
  return normalizeAnswerResult(data);
}

/** M7 — Defensive normalizer for the daily-puzzle response: coerces booleans
 * via `=== true`, keeps string fields nullable rather than trusting the wire,
 * and falls back to the standard card defaults. */
function normalizeDailyPuzzle(raw: Partial<DailyPuzzle> | null | undefined): DailyPuzzle {
  return {
    dailyDate: typeof raw?.dailyDate === 'string' ? raw.dailyDate : '',
    card: normalizePuzzleCard(raw?.card),
    solvedToday: raw?.solvedToday === true,
    solvedAt: typeof raw?.solvedAt === 'string' && raw.solvedAt.length > 0 ? raw.solvedAt : null,
    nextResetAt: typeof raw?.nextResetAt === 'string' ? raw.nextResetAt : '',
  };
}

/**
 * M7 — GET /puzzles/daily (Bearer) → 200 DailyPuzzle.
 *
 * Today's featured puzzle in the UTC day window plus the caller's solve
 * status. Throws `ApiError`:
 *  - status 404 / `DAILY_UNAVAILABLE` while there are no puzzles to feature
 *    (server) — also thrown locally when a 200 body arrives without a usable
 *    `card`, so shape drift can never crash the screen with a blank card;
 *  - status 0 / NETWORK_ERROR on connection failure or timeout;
 *  - the server's status + envelope code otherwise (401 / 400 …).
 */
export async function fetchDailyPuzzle(token: string): Promise<DailyPuzzle> {
  const data = await puzzleRequest<DailyPuzzle>('/puzzles/daily', { token });
  if (data === null || typeof data !== 'object' || typeof (data as DailyPuzzle).card !== 'object') {
    throw new ApiError(404, 'DAILY_UNAVAILABLE', 'No puzzles are available yet. Check back soon.');
  }
  return normalizeDailyPuzzle(data);
}
