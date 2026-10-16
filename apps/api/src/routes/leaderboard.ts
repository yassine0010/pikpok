import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireUserId } from '../middleware/auth.js';
import { parseBody } from '../lib/validate.js';

/**
 * GET /leaderboard — read-only XP standings.
 *
 * Deliberately exposes only the stored xp/streak values. There is no way for a
 * client to award itself XP here; XP awarding is server-side only (M4).
 * Entries never include email or password_hash.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const leaderboardQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(MAX_LIMIT, `limit must be at most ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
});

/**
 * Full ordering of every user: xp DESC, deterministic tie-break on
 * created_at ASC (oldest account first). `rank` is the 1-based position in
 * the FULL ordering — not in the returned page — so it stays correct for
 * `me` even when the user is outside the `limit` window.
 */
const RANKED_CTE = `
  WITH ranked AS (
    SELECT id,
           display_name,
           xp,
           streak,
           ROW_NUMBER() OVER (ORDER BY xp DESC, created_at ASC)::int AS rank
      FROM users
  )
`;

const ENTRIES_SQL = `
${RANKED_CTE}
SELECT rank, id, display_name, xp, streak
  FROM ranked
 ORDER BY rank ASC
 LIMIT $1
`;

// Exactly one row: `total` is always present; the me_* columns are NULL only
// if the authenticated user somehow no longer exists in `users`.
const ME_AND_TOTAL_SQL = `
${RANKED_CTE},
me AS (
  SELECT rank, id, display_name, xp, streak
    FROM ranked
   WHERE id = $1
)
SELECT (SELECT COUNT(*) FROM users)::int AS total,
       (SELECT rank       FROM me)       AS me_rank,
       (SELECT id         FROM me)       AS me_id,
       (SELECT display_name FROM me)     AS me_display_name,
       (SELECT xp         FROM me)       AS me_xp,
       (SELECT streak     FROM me)       AS me_streak
`;

/** Public leaderboard entry — exactly these fields, nothing internal. */
export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  xp: number;
  streak: number;
}

interface EntryRow {
  rank: number;
  id: string;
  display_name: string;
  xp: number;
  streak: number;
}

interface MeAndTotalRow {
  total: number;
  me_rank: number | null;
  me_id: string | null;
  me_display_name: string | null;
  me_xp: number | null;
  me_streak: number | null;
}

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/leaderboard', async (request, reply) => {
    const userId = requireUserId(request);
    const { limit } = parseBody(leaderboardQuerySchema, request.query);

    const [entriesResult, meResult] = await Promise.all([
      pool.query<EntryRow>(ENTRIES_SQL, [limit]),
      pool.query<MeAndTotalRow>(ME_AND_TOTAL_SQL, [userId]),
    ]);

    const meRow = meResult.rows[0];

    let me: LeaderboardEntry | null = null;
    if (
      meRow &&
      meRow.me_id !== null &&
      meRow.me_rank !== null &&
      meRow.me_display_name !== null &&
      meRow.me_xp !== null &&
      meRow.me_streak !== null
    ) {
      me = {
        rank: meRow.me_rank,
        id: meRow.me_id,
        displayName: meRow.me_display_name,
        xp: meRow.me_xp,
        streak: meRow.me_streak,
      };
    }

    const entries: LeaderboardEntry[] = entriesResult.rows.map((row) => ({
      rank: row.rank,
      id: row.id,
      displayName: row.display_name,
      xp: row.xp,
      streak: row.streak,
    }));

    return reply.code(200).send({
      entries,
      me,
      total: meRow?.total ?? 0,
    });
  });
}
