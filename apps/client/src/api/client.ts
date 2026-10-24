/**
 * Minimal typed fetch wrapper for the PikPok API.
 *
 * Base URL comes from the `EXPO_PUBLIC_API_URL` env var (see `.env.example`).
 * The default `http://localhost:3000` works for iOS Simulator and
 * `expo start --web`. On the **Android emulator**, `localhost` is the emulator
 * itself, so point `EXPO_PUBLIC_API_URL` at `http://10.0.2.2:3000` (the
 * emulator's alias for the host machine's loopback). On a physical device use
 * your dev machine's LAN IP instead.
 */

// NOTE: must be a static `process.env.EXPO_PUBLIC_*` dot-reference so Metro can
// inline it into the bundle at build time.
const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_API_URL = 'http://localhost:3000';

/** Base URL without a trailing slash. */
export const API_BASE_URL = (RAW_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 15000;

/** Server user shape (camelCase). `age` may be null when not provided. */
export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  age: number | null;
  xp: number;
  streak: number;
  level: number;
  /** M6 — total puzzles the user has ever solved (all-time, not session). */
  solvedCount: number;
}

export interface SignupInput {
  displayName: string;
  email: string;
  password: string;
  age: number;
}

export interface ProfilePatch {
  displayName?: string;
  age?: number;
}

export interface AuthSession {
  token: string;
  user: ApiUser;
}

/** Typed API error carrying the HTTP status and the server's error code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bearer token; omit for public endpoints. */
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw toApiError(response.status, data);
  }

  return data as T;
}

/**
 * Parses the `{ error: { code, message } }` envelope into an `ApiError`,
 * falling back to a generic code/message when the body is missing or malformed.
 *
 * Exported so other API modules (see `puzzles.ts` — the future puzzle-service
 * seam) share the exact same error handling instead of duplicating it. Existing
 * behavior of `request()` is unchanged.
 */
export function toApiError(
  status: number,
  data: unknown,
  fallbackMessage?: string
): ApiError {
  const errorPayload = (data as { error?: { code?: string; message?: string } } | null)?.error;
  return new ApiError(
    status,
    errorPayload?.code ?? 'UNKNOWN_ERROR',
    errorPayload?.message ?? fallbackMessage ?? `Request failed with status ${status}.`
  );
}

/** Defensive normalizer: applies contract defaults and drops nullish values. */
function normalizeUser(raw: Partial<ApiUser> | null | undefined): ApiUser {
  return {
    id: String(raw?.id ?? ''),
    email: String(raw?.email ?? ''),
    displayName: String(raw?.displayName ?? ''),
    age: typeof raw?.age === 'number' ? raw.age : null,
    xp: Number(raw?.xp ?? 0),
    streak: Number(raw?.streak ?? 0),
    level: Number(raw?.level ?? 1),
    solvedCount: Number(raw?.solvedCount ?? 0),
  };
}

function toAuthSession(data: AuthSession | null | undefined): AuthSession {
  return {
    token: String(data?.token ?? ''),
    user: normalizeUser(data?.user),
  };
}

/** POST /auth/signup → 201 { token, user } */
export async function signup(input: SignupInput): Promise<AuthSession> {
  const data = await request<AuthSession>('/auth/signup', {
    method: 'POST',
    body: {
      displayName: input.displayName,
      email: input.email,
      password: input.password,
      age: input.age,
    },
  });
  const session = toAuthSession(data);
  if (!session.token) {
    throw new ApiError(500, 'INVALID_RESPONSE', 'The server did not return a session token.');
  }
  return session;
}

/** POST /auth/login → 200 { token, user } */
export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const data = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email: input.email, password: input.password },
  });
  const session = toAuthSession(data);
  if (!session.token) {
    throw new ApiError(500, 'INVALID_RESPONSE', 'The server did not return a session token.');
  }
  return session;
}

/** GET /profile (Bearer) → 200 { user } */
export async function getProfile(token: string): Promise<ApiUser> {
  const data = await request<{ user?: ApiUser }>('/profile', { token });
  return normalizeUser(data?.user);
}

/** PATCH /profile (Bearer, { displayName?, age? }) → 200 { user } */
export async function updateProfile(token: string, patch: ProfilePatch): Promise<ApiUser> {
  const body: ProfilePatch = {};
  if (patch.displayName !== undefined) body.displayName = patch.displayName;
  if (patch.age !== undefined) body.age = patch.age;
  const data = await request<{ user?: ApiUser }>('/profile', { method: 'PATCH', body, token });
  return normalizeUser(data?.user);
}

/** One row of the global XP leaderboard. Defensively typed to the contract —
 * it never carries `email` (or any credential material), so nothing sensitive
 * can leak into the leaderboard UI. */
export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  xp: number;
  streak: number;
}

/** The signed-in user's own ranking row; `null` when they aren't ranked yet. */
export interface LeaderboardSelf {
  rank: number;
  id: string;
  displayName: string;
  xp: number;
  streak: number;
}

export interface LeaderboardResponse {
  /** Up to `limit` entries, ordered by XP descending, 1-based `rank` over the
   * full ranking. */
  entries: LeaderboardEntry[];
  me: LeaderboardSelf | null;
  /** Total number of ranked solvers (not just the returned page). */
  total: number;
}

/** Defensive normalizer: coerces contract fields and drops anything extra. */
function normalizeLeaderboardEntry(
  raw: Partial<LeaderboardEntry> | null | undefined
): LeaderboardEntry {
  return {
    rank: Number(raw?.rank ?? 0),
    id: String(raw?.id ?? ''),
    displayName: String(raw?.displayName ?? ''),
    xp: Number(raw?.xp ?? 0),
    streak: Number(raw?.streak ?? 0),
  };
}

function toLeaderboardResponse(
  data: LeaderboardResponse | null | undefined
): LeaderboardResponse {
  const entries = Array.isArray(data?.entries)
    ? data.entries.map((entry) => normalizeLeaderboardEntry(entry))
    : [];
  return {
    entries,
    me: data?.me ? normalizeLeaderboardEntry(data.me) : null,
    total: Number(data?.total ?? entries.length),
  };
}

/** GET /leaderboard?limit=<int> (Bearer) → 200 { entries, me, total } */
export async function fetchLeaderboard(
  token: string,
  limit?: number
): Promise<LeaderboardResponse> {
  // Only send `limit` when it's a sane positive integer; otherwise let the
  // server apply its default (50) and surface VALIDATION_ERROR for bad input.
  const query =
    typeof limit === 'number' && Number.isFinite(limit) && limit >= 1
      ? `?limit=${Math.floor(limit)}`
      : '';
  const data = await request<LeaderboardResponse>(`/leaderboard${query}`, { token });
  return toLeaderboardResponse(data);
}

/**
 * Maps an unknown error from the auth flows to a message safe to show in the UI.
 * Server error codes are translated to friendly copy; `VALIDATION_ERROR`
 * details from the server are surfaced as-is.
 */
export function formatAuthError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'EMAIL_ALREADY_REGISTERED':
        return 'An account with that email already exists.';
      case 'INVALID_CREDENTIALS':
        return 'Incorrect email or password.';
      case 'VALIDATION_ERROR':
        return error.message || 'Some fields are invalid. Please check your input.';
      case 'NETWORK_ERROR':
        return error.message;
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
