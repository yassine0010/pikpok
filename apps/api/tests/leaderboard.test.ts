import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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

const ENTRY_KEYS = ['displayName', 'id', 'rank', 'streak', 'xp'];

interface TestUser {
  id: string;
  token: string;
}

/**
 * Inserts a user with controlled xp/streak (and optionally a fixed
 * created_at for tie-break tests) directly via SQL, then mints a valid
 * bearer token for it — same JWT the auth routes issue.
 */
async function createUser(
  label: string,
  xp: number,
  streak: number,
  createdAt?: string,
): Promise<TestUser> {
  seq += 1;
  const email = `lb-${label}-${runId}-${seq}@example.com`;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, xp, streak, created_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
     RETURNING id`,
    [email, `LB ${label}`.slice(0, 30), 'not-a-real-password-hash', xp, streak, createdAt ?? null],
  );
  const id = result.rows[0]!.id;
  return { id, token: app.jwt.sign({ sub: id }) };
}

function authHeader(user: TestUser): Record<string, string> {
  return { authorization: `Bearer ${user.token}` };
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  xp: number;
  streak: number;
}

interface LeaderboardBody {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
}

// Each test starts from an empty users table so ranks/totals are exact.
// (Test files run serially — see vitest.config.ts — so this cannot race
// the auth tests' shared test database.)
beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('GET /leaderboard', () => {
  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/leaderboard' });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for a garbage token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: { authorization: 'Bearer not.a.valid.token' },
    });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('returns entries ordered by xp descending with 1-based ranks', async () => {
    const low = await createUser('low', 310, 2);
    const me = await createUser('me', 0, 0);
    const top = await createUser('top', 3420, 28);
    const mid = await createUser('mid', 1450, 12);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;

    // Exact contract shape and ordering — dense 1-based ranks over ALL users.
    // With the default limit, `me` (xp 0) is inside the window too — rank 4.
    expect(body.entries).toEqual([
      { rank: 1, id: top.id, displayName: 'LB top', xp: 3420, streak: 28 },
      { rank: 2, id: mid.id, displayName: 'LB mid', xp: 1450, streak: 12 },
      { rank: 3, id: low.id, displayName: 'LB low', xp: 310, streak: 2 },
      { rank: 4, id: me.id, displayName: 'LB me', xp: 0, streak: 0 },
    ]);
    expect(body.entries.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(body.entries.map((entry) => entry.xp)).toEqual([3420, 1450, 310, 0]);
    expect(body.total).toBe(4);
    // The authenticated user is last by xp and is reported in `me`.
    expect(body.me).toEqual({ rank: 4, id: me.id, displayName: 'LB me', xp: 0, streak: 0 });
  });

  it('breaks xp ties deterministically by created_at ascending', async () => {
    // Insert the newer account first: rank must follow created_at, not insertion order.
    const newer = await createUser('tie-new', 500, 1, '2026-06-01T00:00:00Z');
    const older = await createUser('tie-old', 500, 1, '2026-01-01T00:00:00Z');
    const me = await createUser('tie-me', 100, 0);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;

    expect(body.entries.map((entry) => entry.id)).toEqual([older.id, newer.id, me.id]);
    expect(body.entries.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it('includes me with the correct rank even when outside the limit window', async () => {
    for (let xp = 100; xp <= 500; xp += 100) {
      await createUser(`win${xp}`, xp, 1);
    }
    const me = await createUser('outside', 0, 0);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard?limit=2',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;

    expect(body.entries).toHaveLength(2);
    expect(body.entries.map((entry) => entry.rank)).toEqual([1, 2]);
    // me is the 6th user overall (5 loop users + me) — still reported.
    expect(body.me).toEqual({ rank: 6, id: me.id, displayName: 'LB outside', xp: 0, streak: 0 });
    expect(body.entries.some((entry) => entry.id === me.id)).toBe(false);
    expect(body.total).toBe(6);
  });

  it('honors the limit parameter', async () => {
    await createUser('lim1', 100, 0);
    await createUser('lim2', 200, 0);
    await createUser('lim3', 300, 0);
    await createUser('lim4', 400, 0);
    const me = await createUser('limme', 500, 0);

    const one = await app.inject({
      method: 'GET',
      url: '/leaderboard?limit=1',
      headers: authHeader(me),
    });
    expect(one.statusCode).toBe(200);
    const oneBody = one.json() as LeaderboardBody;
    expect(oneBody.entries).toHaveLength(1);
    expect(oneBody.entries[0]).toEqual({ rank: 1, id: me.id, displayName: 'LB limme', xp: 500, streak: 0 });
    expect(oneBody.total).toBe(5);

    const three = await app.inject({
      method: 'GET',
      url: '/leaderboard?limit=3',
      headers: authHeader(me),
    });
    expect(three.statusCode).toBe(200);
    const threeBody = three.json() as LeaderboardBody;
    expect(threeBody.entries).toHaveLength(3);
    expect(threeBody.entries.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(threeBody.entries.map((entry) => entry.xp)).toEqual([500, 400, 300]);
  });

  it('defaults to 50 entries when no limit is given', async () => {
    for (let i = 1; i <= 60; i += 1) {
      await createUser(`bulk${i}`, i, 0);
    }
    const me = await createUser('bulkme', 0, 0);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;
    expect(body.entries).toHaveLength(50);
    expect(body.entries[0]?.xp).toBe(60);
    expect(body.total).toBe(61);
  });

  it('rejects invalid limits with 400 VALIDATION_ERROR', async () => {
    const me = await createUser('badlimit', 10, 0);

    for (const limit of ['0', '101', '-5', 'abc', '1.5']) {
      const res = await app.inject({
        method: 'GET',
        url: `/leaderboard?limit=${limit}`,
        headers: authHeader(me),
      });
      expect(res.statusCode, `limit=${limit}`).toBe(400);
      const body = res.json() as { error: { code: string; details?: unknown[] } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(body.error.details)).toBe(true);
    }
  });

  it('never exposes email or password_hash in entries or me', async () => {
    await createUser('safe1', 900, 3);
    const me = await createUser('safe2', 100, 1);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;

    const raw = JSON.stringify(body);
    expect(raw).not.toContain('email');
    expect(raw).not.toContain('password');
    for (const entry of [...body.entries, body.me!]) {
      expect(Object.keys(entry).sort()).toEqual(ENTRY_KEYS);
    }
  });

  it('total reflects all users, not just the returned page', async () => {
    await createUser('tot1', 300, 0);
    await createUser('tot2', 200, 0);
    await createUser('tot3', 100, 0);
    const me = await createUser('totme', 50, 0);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard?limit=2',
      headers: authHeader(me),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;
    expect(body.entries).toHaveLength(2);
    expect(body.total).toBe(4);
  });

  it('returns an empty board with me=null if the account no longer exists', async () => {
    const ghost = await createUser('ghost', 123, 1);
    await pool.query('DELETE FROM users WHERE id = $1', [ghost.id]);

    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: authHeader(ghost),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as LeaderboardBody;
    expect(body.entries).toEqual([]);
    expect(body.me).toBeNull();
    expect(body.total).toBe(0);
  });
});
