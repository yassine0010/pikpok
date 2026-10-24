import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

/**
 * Daily puzzle & streak engine (M7), DB-backed.
 *
 * This file OWNS the test-DB puzzles table while it runs (the deterministic
 * pick is epochDays % puzzleCount over the id-ordered catalog, so the pick
 * must be computed against a known row set) and cleans up its snapshot and
 * catalog rows on exit — test files run serially (vitest.config.ts), so
 * later files (leaderboard, puzzles) start from the same empty-catalog state
 * they have always expected.
 */

const DAY_MS = 86_400_000;

const app = await buildApp({ logger: false });

// Unique suffix so repeated local runs never collide on the unique email index.
const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
let seq = 0;

interface TestUser {
  id: string;
  token: string;
}

/**
 * Inserts a user directly via SQL (controlled xp/streak) and mints a valid
 * bearer token — same JWT the auth routes issue.
 */
async function createUser(label: string, xp: number, streak: number): Promise<TestUser> {
  seq += 1;
  const email = `dl-${label}-${runId}-${seq}@example.com`;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, xp, streak)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, `DL ${label}`.slice(0, 30), 'not-a-real-password-hash', xp, streak],
  );
  const id = result.rows[0]!.id;
  return { id, token: app.jwt.sign({ sub: id }) };
}

function authHeader(user: TestUser): Record<string, string> {
  return { authorization: `Bearer ${user.token}` };
}

/**
 * Inserts a puzzle row the way the importer does; every puzzle shares the
 * answer '42' so daily solves are one-liners server-side only.
 */
async function insertPuzzle(id: string): Promise<void> {
  await pool.query(
    `INSERT INTO puzzles
       (id, domain, difficulty, difficulty_level, title, prompt, hints,
        answer, accepted_variants, image_url, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11::jsonb)`,
    [
      id,
      'math',
      'easy',
      1,
      'Daily Fill',
      `Daily filler puzzle ${id}.`,
      JSON.stringify([]),
      '42',
      JSON.stringify(['42']),
      `/puzzles/images/test/${id}.png`,
      JSON.stringify({ puzzle_type: 'test', difficulty: 'easy' }),
    ],
  );
}

// The catalog this file tests against. Sorted ids make the deterministic
// daily pick computable in TS: featured = ids[epochDays % ids.length].
const ids = ['dz_a', 'dz_b', 'dz_c', 'dz_d', 'dz_e', 'dz_z'];

function seedCatalog(): Promise<unknown> {
  return Promise.all(ids.map((id) => insertPuzzle(id)));
}

/** UTC day bookkeeping — mirrors src/routes/puzzles.ts exactly. */
function utcDay(): { epochDays: number; todayStartMs: number; dailyDate: string } {
  const nowMs = Date.now();
  const epochDays = Math.floor(nowMs / DAY_MS);
  const todayStartMs = epochDays * DAY_MS;
  return { epochDays, todayStartMs, dailyDate: new Date(todayStartMs).toISOString().slice(0, 10) };
}

/** Deterministically the id today's snapshot SHOULD hold (recomputed pick). */
function expectedPick(): string {
  return ids[utcDay().epochDays % ids.length]!;
}

interface Card {
  id: string;
  domain: string;
  difficulty: number;
  title: string;
  prompt: string;
  imageUrl: string;
  hints: string[];
}

interface DailyBody {
  dailyDate: string;
  card: Card;
  solvedToday: boolean;
  solvedAt: string | null;
  nextResetAt: string;
}

interface AnswerBody {
  correct: boolean;
  xpAwarded: number;
  xpTotal: number;
  streak: number;
  level: number;
  solvedCount: number;
  correctAnswer?: string;
}

const DAILY_KEYS = ['card', 'dailyDate', 'nextResetAt', 'solvedAt', 'solvedToday'];
const CARD_KEYS = ['difficulty', 'domain', 'hints', 'id', 'imageUrl', 'prompt', 'title'];
// POST /puzzles/:id/answer wire contract must be unchanged by M7.
const ANSWER_KEYS = ['correct', 'level', 'solvedCount', 'streak', 'xpAwarded', 'xpTotal'];

beforeAll(async () => {
  await pool.query('DELETE FROM user_puzzle_solves');
  await pool.query('DELETE FROM daily_featured');
  await pool.query('DELETE FROM puzzles');
  await seedCatalog();
});

// Each test starts with no users and no snapshot for today; the first
// request of each test re-snapshots the daily deterministically.
beforeEach(async () => {
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM daily_featured');
});

afterAll(async () => {
  await app.close();
  // Restore the state later files expect: no snapshots (daily_featured must
  // go first — it references the catalog), then an empty catalog.
  await pool.query('DELETE FROM daily_featured');
  await pool.query('DELETE FROM puzzles');
  await pool.end();
});

/** Backdates the user's daily watermark to an exact UTC instant. */
async function backdateWatermark(userId: string, instantMs: number): Promise<void> {
  await pool.query(`UPDATE users SET last_daily_solve_at = $2 WHERE id = $1`, [
    userId,
    new Date(instantMs).toISOString(),
  ]);
}

/** The user's current backlog fields, post-anything. */
async function userState(
  userId: string,
): Promise<{ streak: number; lastDailySolveAt: Date | null }> {
  const { rows } = await pool.query<{ streak: number; lastDailySolveAt: Date | null }>(
    `SELECT streak, last_daily_solve_at AS "lastDailySolveAt"
       FROM users WHERE id = $1`,
    [userId],
  );
  return { streak: rows[0]!.streak, lastDailySolveAt: rows[0]!.lastDailySolveAt };
}

/** Today's snapshot row (may be undefined when nothing was snapshotted). */
async function featuredToday(): Promise<{ utcDate: string; puzzleId: string } | undefined> {
  const { rows } = await pool.query<{ utcDate: string; puzzleId: string }>(
    `SELECT utc_date::text AS "utcDate", puzzle_id AS "puzzleId"
       FROM daily_featured
      WHERE utc_date = $1`,
    [utcDay().dailyDate],
  );
  const row = rows[0];
  return row === undefined ? undefined : { utcDate: row.utcDate, puzzleId: row.puzzleId };
}

/** Solve today's featured daily correctly and return the answer response. */
async function solveDaily(user: TestUser): Promise<AnswerBody> {
  const daily = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(user) });
  expect(daily.statusCode).toBe(200);
  const id = (daily.json() as DailyBody).card.id;
  const res = await app.inject({
    method: 'POST',
    url: `/puzzles/${id}/answer`,
    headers: authHeader(user),
    payload: { answer: '42' },
  });
  expect(res.statusCode).toBe(200);
  return res.json() as AnswerBody;
}

describe('auth', () => {
  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/puzzles/daily' });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /puzzles/daily', () => {
  it('returns 404 DAILY_UNAVAILABLE when the catalog is empty, then survives a reseed', async () => {
    const me = await createUser('empty-cat', 0, 0);
    // Order matters: snapshots reference the catalog.
    await pool.query('DELETE FROM daily_featured');
    await pool.query('DELETE FROM puzzles');

    const res = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe('DAILY_UNAVAILABLE');
    expect((res.json() as { error: { message: string } }).error.message).toBe(
      'No puzzles are available yet',
    );

    // Once at least one puzzle exists, the endpoint works again.
    await seedCatalog();
    const ok = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect(ok.statusCode).toBe(200);
  });

  it('picks deterministically: same card on repeated GETs, computed as epochDays % count', async () => {
    const me = await createUser('det', 0, 0);
    const { dailyDate, todayStartMs } = utcDay();

    const first = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    const second = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const body1 = first.json() as DailyBody;
    const body2 = second.json() as DailyBody;

    // Exactly the contracted top-level keys (+ the card inner keys).
    expect(Object.keys(JSON.parse(JSON.stringify(body1))).sort()).toEqual(DAILY_KEYS);
    expect(Object.keys(body1.card).sort()).toEqual(CARD_KEYS);
    expect(body1.card.id).toBe(expectedPick());
    expect(body2.card.id).toBe(body1.card.id);

    expect(body1.dailyDate).toBe(dailyDate);
    expect(body1.solvedToday).toBe(false);
    expect(body1.solvedAt).toBeNull();
    // nextResetAt is the next 00:00 UTC — strictly after now.
    expect(new Date(body1.nextResetAt).getTime()).toBe(todayStartMs + DAY_MS);
    expect(new Date(body1.nextResetAt).getTime()).toBeGreaterThan(Date.now());

    // No answer leakage anywhere in the daily payload.
    const raw = JSON.stringify(body1);
    expect(raw.toLowerCase()).not.toContain('answer');
    expect(raw.toLowerCase()).not.toContain('solution');
    expect(raw).not.toContain('correctAnswer');
    expect(raw).not.toContain('"raw"');
  });

  it('serves the historical snapshot: a pre-seeded featured row wins over the recomputed pick', async () => {
    const me = await createUser('snapshot', 0, 0);
    const { dailyDate } = utcDay();

    // Already snapshotted today (e.g. someone opened the daily earlier in
    // the day, then the catalog grew): the pick must stay frozen.
    await pool.query(
      `INSERT INTO daily_featured (utc_date, puzzle_id) VALUES ($1::date, 'dz_a')`,
      [dailyDate],
    );

    const res = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as DailyBody;
    // 'dz_a' regardless of what epochDays % ids.length recomputes to today.
    expect(body.card.id).toBe('dz_a');
  });

  it('marks solvedToday true right after solving the daily, streak 0 → 1 in the same flow', async () => {
    const me = await createUser('freshsolve', 0, 0);
    const { dailyDate, todayStartMs } = utcDay();

    const first = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect((first.json() as DailyBody).solvedToday).toBe(false);

    const answerBody = await solveDaily(me);
    // Contract shape untouched by M7 and the streak credited IN the response.
    expect(Object.keys(answerBody).sort()).toEqual(ANSWER_KEYS);
    expect(answerBody.correct).toBe(true);
    expect(answerBody.xpAwarded).toBe(10);
    expect(answerBody.xpTotal).toBe(10);
    expect(answerBody.streak).toBe(1);

    const after = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    expect(after.statusCode).toBe(200);
    const body = after.json() as DailyBody;
    expect(body.dailyDate).toBe(dailyDate);
    expect(body.solvedToday).toBe(true);
    expect(body.solvedAt).not.toBeNull();
    expect(new Date(body.solvedAt!).getTime()).toBeGreaterThanOrEqual(todayStartMs);
    // Same featured card both times.
    expect(body.card.id).toBe((first.json() as DailyBody).card.id);
  });
});

describe('streak engine (POST /puzzles/:id/answer)', () => {
  it('resets to 1 across a 2+ day gap: watermark backdated 3 days', async () => {
    const me = await createUser('gap', 0, 0);
    const { todayStartMs } = utcDay();

    expect((await solveDaily(me)).streak).toBe(1);
    await backdateWatermark(me.id, todayStartMs - 3 * DAY_MS);

    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(me),
      payload: { answer: '42' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as AnswerBody).streak).toBe(1);
    const state = await userState(me.id);
    expect(state.streak).toBe(1);
    expect(state.lastDailySolveAt!.getTime()).toBeGreaterThanOrEqual(todayStartMs);
  });

  it('continues the streak across consecutive UTC days: backdated watermark → streak 2, xpAwarded 0', async () => {
    const me = await createUser('continuity', 0, 0);
    const { todayStartMs } = utcDay();

    expect((await solveDaily(me)).streak).toBe(1);
    // Yesterday at noon UTC: inside yesterday's window (>= yesterdayStart,
    // < todayStart), so a correct solve today must INCREMENT.
    await backdateWatermark(me.id, todayStartMs - 12 * 60 * 60 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(me),
      payload: { answer: '42' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as AnswerBody;
    expect(body.streak).toBe(2);
    // XP is first-solve-only: this re-solve earns DAILY credit but 0 XP.
    expect(body.xpAwarded).toBe(0);
    expect(body.xpTotal).toBe(10);
    const state = await userState(me.id);
    expect(state.lastDailySolveAt!.getTime()).toBeGreaterThanOrEqual(todayStartMs);
  });

  it('credits exactly once per UTC day: same-day re-solve leaves streak AND watermark untouched', async () => {
    const me = await createUser('sameday', 0, 0);
    const { todayStartMs } = utcDay();

    expect((await solveDaily(me)).streak).toBe(1);
    const before = await userState(me.id);
    expect(before.lastDailySolveAt!.getTime()).toBeGreaterThanOrEqual(todayStartMs);

    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(me),
      payload: { answer: '42' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as AnswerBody).streak).toBe(1);

    const after = await userState(me.id);
    expect(after.streak).toBe(1);
    // Same statement result — the watermark did not even advance.
    expect(after.lastDailySolveAt!.getTime()).toBe(before.lastDailySolveAt!.getTime());
  });

  it('leaves streak and watermark untouched on a NON-daily correct solve', async () => {
    const me = await createUser('nondaily', 0, 7);
    const daily = await app.inject({ method: 'GET', url: '/puzzles/daily', headers: authHeader(me) });
    const featuredId = (daily.json() as DailyBody).card.id;
    const otherId = ids.find((id) => id !== featuredId)!;

    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${otherId}/answer`,
      headers: authHeader(me),
      payload: { answer: '42' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as AnswerBody;
    expect(body.correct).toBe(true);
    expect(body.xpAwarded).toBe(10);
    expect(body.streak).toBe(7);

    const state = await userState(me.id);
    expect(state.streak).toBe(7);
    expect(state.lastDailySolveAt).toBeNull();
  });

  it('never credits the daily on an INCORRECT featured submission', async () => {
    // Wrong answer on the featured puzzle: attempts/solve semantics still
    // apply, but the daily credit never does.
    const me = await createUser('wrongdaily', 0, 5);
    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(me),
      payload: { answer: 'not 42' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as AnswerBody;
    expect(body.correct).toBe(false);
    expect(body.streak).toBe(5);

    const state = await userState(me.id);
    expect(state.streak).toBe(5);
    expect(state.lastDailySolveAt).toBeNull();
  });

  it('snapshots + credits the daily from the ANSWER path alone, never opening GET /puzzles/daily', async () => {
    const me = await createUser('answersnapshot', 0, 0);
    const { todayStartMs, dailyDate } = utcDay();

    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(me),
      payload: { answer: '42' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as AnswerBody).streak).toBe(1);

    // The snapshot was written by the answer transaction itself…
    const featured = await featuredToday();
    expect(featured).toEqual({ utcDate: dailyDate, puzzleId: expectedPick() });
    // …and the watermark is inside today.
    const state = await userState(me.id);
    expect(state.lastDailySolveAt!.getTime()).toBeGreaterThanOrEqual(todayStartMs);
  });

  it('credits each user independently: a second user’s first daily solve is streak 1, not 2', async () => {
    const first = await createUser('racer-a', 0, 0);
    const second = await createUser('racer-b', 0, 0);
    const { todayStartMs } = utcDay();

    expect((await solveDaily(first)).streak).toBe(1);

    // A different user solving the same daily minutes later gets their own
    // single bump (streak 1) — the daily ledger is per user, not global.
    const res = await app.inject({
      method: 'POST',
      url: `/puzzles/${expectedPick()}/answer`,
      headers: authHeader(second),
      payload: { answer: '42' },
    });
    expect((res.json() as AnswerBody).streak).toBe(1);
    const state = await userState(second.id);
    expect(state.streak).toBe(1);
    expect(state.lastDailySolveAt!.getTime()).toBeGreaterThanOrEqual(todayStartMs);
  });
});
