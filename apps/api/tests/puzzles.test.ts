import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = await buildApp({ logger: false });

afterAll(async () => {
  await app.close();
  await pool.end();
});

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
  const email = `pz-${label}-${runId}-${seq}@example.com`;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, xp, streak)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, `PZ ${label}`.slice(0, 30), 'not-a-real-password-hash', xp, streak],
  );
  const id = result.rows[0]!.id;
  return { id, token: app.jwt.sign({ sub: id }) };
}

function authHeader(user: TestUser): Record<string, string> {
  return { authorization: `Bearer ${user.token}` };
}

/**
 * Inserts a puzzle catalog row the way the importer does: answer handling
 * server-side only, cards carry no trace of it.
 */
async function insertPuzzle(puzzle: {
  id: string;
  domain: string;
  difficulty: string;
  difficultyLevel: number;
  title: string;
  prompt: string;
  hints: string[];
  answer: string;
  acceptedVariants: string[];
}): Promise<void> {
  await pool.query(
    `INSERT INTO puzzles
       (id, domain, difficulty, difficulty_level, title, prompt, hints,
        answer, accepted_variants, image_url, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11::jsonb)`,
    [
      puzzle.id,
      puzzle.domain,
      puzzle.difficulty,
      puzzle.difficultyLevel,
      puzzle.title,
      puzzle.prompt,
      JSON.stringify(puzzle.hints),
      puzzle.answer,
      JSON.stringify(puzzle.acceptedVariants),
      `/puzzles/images/test/${puzzle.id}.png`,
      JSON.stringify({ puzzle_type: 'test', difficulty: puzzle.difficulty }),
    ],
  );
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

interface FeedBody {
  cards: Card[];
  nextCursor: string | null;
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

// POST /puzzles/:id/answer wire contract (M6: + level, solvedCount).
const ANSWER_KEYS = ['correct', 'level', 'solvedCount', 'streak', 'xpAwarded', 'xpTotal'];

const USER_KEYS = ['age', 'displayName', 'email', 'id', 'level', 'solvedCount', 'streak', 'xp'];

// Pagination tests need a deterministic catalog size, so this file owns the
// test-DB puzzles table (player rows cascade away with users; nothing outside
// this file depends on puzzle rows). The daily.test.ts file wipes its own
// snapshot rows and catalog BEFORE/AFTER running (serial files), so this
// DELETE cascade list stays valid.
const DAY_MS = 86_400_000;

beforeAll(async () => {
  await pool.query('DELETE FROM user_puzzle_solves');
  // daily_featured references puzzles(id): clear snapshots before the catalog.
  await pool.query('DELETE FROM daily_featured');
  await pool.query('DELETE FROM puzzles');

  await insertPuzzle({
    id: 'zz_number_easy_01',
    domain: 'math',
    difficulty: 'easy',
    difficultyLevel: 1,
    title: 'Number Sequence',
    prompt: 'What number completes the sequence 2 6 18 54 ? Reply with the number.',
    hints: ['It keeps tripling', '6 times 9'],
    answer: '162',
    acceptedVariants: ['162'],
  });
  await insertPuzzle({
    id: 'zz_logic_med_02',
    domain: 'logic',
    difficulty: 'medium',
    difficultyLevel: 3,
    title: 'Gallery Exhibit Assembly',
    prompt: 'Order the three agents from first to last using the two clues.',
    hints: ['Anya leads Chloe', 'Ben just precedes Anya'],
    answer: 'Archivist Ben, Conservator Anya, Historian Chloe',
    acceptedVariants: ['archivist ben, conservator anya, historian chloe'],
  });
  await insertPuzzle({
    id: 'zz_pattern_hard_03',
    domain: 'pattern',
    difficulty: 'hard',
    difficultyLevel: 5,
    title: 'Route & Obstacles',
    prompt: 'Count the hops across the grid and reply with that total.',
    hints: ['Four legs out, three back', 'Group hops in pairs'],
    answer: '1234',
    acceptedVariants: ['1234'],
  });
  for (let i = 0; i < 22; i += 1) {
    await insertPuzzle({
      id: `zz_fill_${String(i).padStart(2, '0')}`,
      domain: 'math',
      difficulty: 'easy',
      difficultyLevel: 1,
      title: 'Number Sequence',
      prompt: `Filler card ${i} of the puzzle catalog.`,
      hints: [],
      answer: '7',
      acceptedVariants: ['7'],
    });
  }

  // Pin TODAY's daily snapshot to a filler (M7): the deterministic pick
  // rotates with the UTC date, so unpinned it can land on one of the three
  // "real" rows above and make the answer tests' streak assertions (e.g.
  // streak stays 3) date-dependent. zz_fill_00 is never submitted in this
  // file, so the daily/streak engine stays a no-op for every test below.
  await pool.query(
    `INSERT INTO daily_featured (utc_date, puzzle_id)
     SELECT $1::date, 'zz_fill_00'
      ON CONFLICT (utc_date) DO NOTHING`,
    [new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS).toISOString().slice(0, 10)],
  );
});

// Each test starts from an empty users table (progress rows cascade away) so
// xp/streak expectations are exact. Test files run serially — see
// vitest.config.ts.
beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('auth', () => {
  it('returns 401 UNAUTHORIZED on both endpoints without a token', async () => {
    const feed = await app.inject({ method: 'GET', url: '/puzzles' });
    expect(feed.statusCode).toBe(401);
    expect((feed.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');

    const submit = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_number_easy_01/answer',
      payload: { answer: '162' },
    });
    expect(submit.statusCode).toBe(401);
    expect((submit.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('serves puzzle images WITHOUT a token (public prefix)', async () => {
    const res = await app.inject({ method: 'GET', url: '/puzzles/images/test/hint.png' });
    // No file exists for this URL, so @fastify/static 404s — the point is the
    // request is NOT bounced by the auth hook (no 401 UNAUTHORIZED).
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});

describe('GET /puzzles', () => {
  it('returns cards with EXACTLY the contract keys and no answer leakage', async () => {
    const me = await createUser('leak', 10, 1);
    const res = await app.inject({
      method: 'GET',
      url: '/puzzles?limit=50',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as FeedBody;
    expect(body.cards.length).toBeGreaterThan(0);
    expect(body.nextCursor).toBeNull();

    const expectedKeys = ['difficulty', 'domain', 'hints', 'id', 'imageUrl', 'prompt', 'title'];
    for (const card of body.cards) {
      expect(Object.keys(card).sort()).toEqual(expectedKeys);
      expect(['math', 'logic', 'pattern', 'words']).toContain(card.domain);
      expect([1, 3, 5]).toContain(card.difficulty);
      expect(card.hints.length).toBeLessThanOrEqual(5);
    }

    const raw = JSON.stringify(body);
    expect(raw.toLowerCase()).not.toContain('answer');
    expect(raw).not.toContain('correctAnswer');
    expect(raw.toLowerCase()).not.toContain('solution');
    expect(raw).not.toContain('"raw"');
    // The known ground truths must not appear anywhere in the payload.
    expect(raw).not.toContain('Archivist Ben, Conservator Anya, Historian Chloe');
    expect(raw).not.toContain('162');
  });

  it('paginates: default limit 20, then last page with nextCursor null', async () => {
    const me = await createUser('pager', 5, 0);

    const page1 = await app.inject({ method: 'GET', url: '/puzzles', headers: authHeader(me) });
    expect(page1.statusCode).toBe(200);
    const page1Body = page1.json() as FeedBody;
    expect(page1Body.cards).toHaveLength(20);
    // ORDER BY id ASC across the whole catalog (22 fillers + 3 real rows).
    expect(page1Body.cards.map((card) => card.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `zz_fill_${String(i).padStart(2, '0')}`),
    );
    expect(page1Body.nextCursor).toBe('20');

    const page2 = await app.inject({
      method: 'GET',
      url: '/puzzles?cursor=20&limit=20',
      headers: authHeader(me),
    });
    expect(page2.statusCode).toBe(200);
    const page2Body = page2.json() as FeedBody;
    expect(page2Body.cards.map((card) => card.id)).toEqual([
      'zz_fill_20',
      'zz_fill_21',
      'zz_logic_med_02',
      'zz_number_easy_01',
      'zz_pattern_hard_03',
    ]);
    expect(page2Body.nextCursor).toBeNull();
  });

  it('supports tiny pages and an out-of-range cursor', async () => {
    const me = await createUser('tiny', 5, 0);

    const one = await app.inject({
      method: 'GET',
      url: '/puzzles?limit=1&cursor=24',
      headers: authHeader(me),
    });
    const oneBody = one.json() as FeedBody;
    expect(oneBody.cards.map((card) => card.id)).toEqual(['zz_pattern_hard_03']);
    expect(oneBody.nextCursor).toBeNull();

    const past = await app.inject({
      method: 'GET',
      url: '/puzzles?cursor=999',
      headers: authHeader(me),
    });
    const pastBody = past.json() as FeedBody;
    expect(pastBody.cards).toEqual([]);
    expect(pastBody.nextCursor).toBeNull();
  });

  it('rejects invalid limit and cursor values with 400 VALIDATION_ERROR', async () => {
    const me = await createUser('badquery', 1, 0);

    for (const limit of ['0', '51', 'abc', '1.5']) {
      const res = await app.inject({
        method: 'GET',
        url: `/puzzles?limit=${limit}`,
        headers: authHeader(me),
      });
      expect(res.statusCode, `limit=${limit}`).toBe(400);
      expect((res.json() as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }

    for (const cursor of ['abc', '-1', '1.5']) {
      const res = await app.inject({
        method: 'GET',
        url: `/puzzles?cursor=${encodeURIComponent(cursor)}`,
        headers: authHeader(me),
      });
      expect(res.statusCode, `cursor=${cursor}`).toBe(400);
      expect((res.json() as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('POST /puzzles/:id/answer', () => {
  it('accepts exact and normalized answers (trim, case, numeric separators)', async () => {
    const me = await createUser('solver', 0, 0);

    const exact = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_number_easy_01/answer',
      headers: authHeader(me),
      payload: { answer: '162' },
    });
    expect(exact.statusCode).toBe(200);
    const exactBody = exact.json() as AnswerBody;
    expect(exactBody.correct).toBe(true);
    expect(exactBody.xpAwarded).toBe(10);
    expect(exactBody.xpTotal).toBe(10);
    // First solve on a fresh user: exactly one NEW solved puzzle, level 1.
    expect(exactBody.solvedCount).toBe(1);
    expect(exactBody.level).toBe(1);
    expect(exactBody.correctAnswer).toBeUndefined();

    // Whitespace/case: solved again = no more XP, but still correct:true.
    // (' 8 ' vs 8 style).
    const fuzzy = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_pattern_hard_03/answer',
      headers: authHeader(me),
      payload: { answer: '  1,234  ' },
    });
    expect(fuzzy.statusCode).toBe(200);
    const fuzzyBody = fuzzy.json() as AnswerBody;
    expect(fuzzyBody.correct).toBe(true);
    expect(fuzzyBody.xpAwarded).toBe(50);
    expect(fuzzyBody.xpTotal).toBe(60);
    // Second distinct puzzle solved → count increments again, level rises.
    expect(fuzzyBody.solvedCount).toBe(2);
    expect(fuzzyBody.level).toBe(1);
  });

  it('returns correctAnswer on a wrong submission with no XP change', async () => {
    const me = await createUser('wrong', 4, 2);

    const res = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_logic_med_02/answer',
      headers: authHeader(me),
      payload: { answer: 'Conservator Anya, Archivist Ben, Historian Chloe', durationMs: 1500 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as AnswerBody;
    // Contract shape (correctAnswer is additive, so check the required keys).
    expect(Object.keys(JSON.parse(JSON.stringify(body))).sort()).toEqual(
      [...ANSWER_KEYS, 'correctAnswer'].sort(),
    );
    expect(body.correct).toBe(false);
    expect(body.xpAwarded).toBe(0);
    expect(body.xpTotal).toBe(4);
    expect(body.streak).toBe(2);
    // A wrong submission never counts as solved.
    expect(body.solvedCount).toBe(0);
    expect(body.correctAnswer).toBe('Archivist Ben, Conservator Anya, Historian Chloe');

    const { rows } = await pool.query<{ xp: number; attempts: string }>(
      `SELECT u.xp, s.attempts
         FROM users u JOIN user_puzzle_solves s ON s.user_id = u.id
        WHERE u.id = $1`,
      [me.id],
    );
    expect(Number(rows[0]!.attempts)).toBe(1);
    expect(rows[0]!.xp).toBe(4);
  });

  it('awards tier XP exactly once: first solve only, streak untouched', async () => {
    const me = await createUser('firstsolve', 0, 3);

    // Wrong first — attempts increment, no solve recorded yet.
    const miss = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_logic_med_02/answer',
      headers: authHeader(me),
      payload: { answer: 'Historian Chloe, Archivist Ben, Conservator Anya' },
    });
    const missBody = miss.json() as AnswerBody;
    expect(missBody.correct).toBe(false);
    expect(missBody.xpAwarded).toBe(0);
    expect(missBody.xpTotal).toBe(0);
    expect(missBody.streak).toBe(3);

    // Now correct — the FIRST solve of this puzzle awards medium XP.
    const solve = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_logic_med_02/answer',
      headers: authHeader(me),
      payload: { answer: '   ARCHIVIST BEN,   Conservator Anya, historian chloe ' },
    });
    const solveBody = solve.json() as AnswerBody;
    expect(solveBody.correct).toBe(true);
    expect(solveBody.xpAwarded).toBe(25);
    expect(solveBody.xpTotal).toBe(25);
    expect(solveBody.streak).toBe(3);
    // The full required contract shape, exactly.
    expect(Object.keys(JSON.parse(JSON.stringify(solveBody))).sort()).toEqual(ANSWER_KEYS);
    // First correct solve of this puzzle → count goes 0 → 1 exactly.
    expect(solveBody.solvedCount).toBe(1);
    expect(solveBody.level).toBe(1);

    // Repeat submission of the same (now-solved) puzzle: still correct:true,
    // but zero XP and unchanged totals.
    const repeat = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_logic_med_02/answer',
      headers: authHeader(me),
      payload: { answer: 'archivist ben, conservator anya, historian chloe' },
    });
    const repeatBody = repeat.json() as AnswerBody;
    expect(repeatBody.correct).toBe(true);
    expect(repeatBody.xpAwarded).toBe(0);
    expect(repeatBody.xpTotal).toBe(25);
    expect(repeatBody.streak).toBe(3);
    expect(repeatBody.correctAnswer).toBeUndefined();
    // Re-solving the SAME puzzle does not move the count.
    expect(repeatBody.solvedCount).toBe(1);
    expect(repeatBody.level).toBe(1);

    const { rows } = await pool.query<{ xp: number; attempts: string; solutions: string; firstSolvedAt: string | null }>(
      `SELECT u.xp,
              s.attempts,
              s.first_solved_at AS "firstSolvedAt",
              s.xp_awarded      AS solutions
         FROM users u JOIN user_puzzle_solves s ON s.user_id = u.id
        WHERE u.id = $1`,
      [me.id],
    );
    expect(rows[0]!.xp).toBe(25);
    expect(Number(rows[0]!.attempts)).toBe(3);
    expect(rows[0]!.solutions).toBe(25);
    expect(rows[0]!.firstSolvedAt).not.toBeNull();
  });

  it('syncs solvedCount to GET /profile after solving (M6)', async () => {
    const me = await createUser('profilesync', 0, 0);

    // Fresh profile: solvedCount present and 0.
    const before = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: authHeader(me),
    });
    expect(before.statusCode).toBe(200);
    const beforeBody = before.json() as { user: Record<string, unknown> };
    expect(Object.keys(beforeBody.user).sort()).toEqual(USER_KEYS);
    expect(beforeBody.user.solvedCount).toBe(0);

    // Solve one puzzle via the API…
    const solve = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_number_easy_01/answer',
      headers: authHeader(me),
      payload: { answer: '162' },
    });
    const solveBody = solve.json() as AnswerBody;
    expect(solveBody.solvedCount).toBe(1);

    // …and the profile reflects EXACTLY that count.
    const after = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: authHeader(me),
    });
    expect(after.statusCode).toBe(200);
    const afterBody = after.json() as { user: Record<string, unknown> };
    expect(afterBody.user.solvedCount).toBe(1);
    // Wrong submissions never enter the count.
    const miss = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_logic_med_02/answer',
      headers: authHeader(me),
      payload: { answer: 'nope' },
    });
    expect((miss.json() as AnswerBody).solvedCount).toBe(1);
    const final = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: authHeader(me),
    });
    expect((final.json() as { user: Record<string, unknown> }).user.solvedCount).toBe(1);
  });

  it('returns 404 NOT_FOUND for an unknown puzzle id', async () => {
    const me = await createUser('ghost404', 0, 0);
    const res = await app.inject({
      method: 'POST',
      url: '/puzzles/no_such_puzzle_99/answer',
      headers: authHeader(me),
      payload: { answer: 'whatever' },
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid answer bodies with 400 VALIDATION_ERROR', async () => {
    const me = await createUser('badbody', 0, 0);

    for (const payload of [{ answer: 'a'.repeat(501) }, { answer: '' }, {}, { answer: 42 }]) {
      const res = await app.inject({
        method: 'POST',
        url: '/puzzles/zz_number_easy_01/answer',
        headers: authHeader(me),
        payload,
      });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect((res.json() as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }

    const badDuration = await app.inject({
      method: 'POST',
      url: '/puzzles/zz_number_easy_01/answer',
      headers: authHeader(me),
      payload: { answer: '1', durationMs: -5 },
    });
    expect(badDuration.statusCode).toBe(400);
  });
});
