import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireUserId } from '../middleware/auth.js';
import { isAnswerCorrect } from '../lib/answer.js';
import { levelFromXp } from '../lib/user.js';
import { parseBody } from '../lib/validate.js';
import type {
  AnswerResult,
  DailyResult,
  PuzzleCard,
  PuzzleDomain,
  PuzzleDifficultyLevel,
} from '../types/puzzles.js';

/**
 * GET /puzzles + GET /puzzles/daily + POST /puzzles/:id/answer — the M5
 * interactive puzzle feed with the M7 daily puzzle & streak engine.
 *
 * Cards are exactly the wire-contract payload (id, domain, difficulty, title,
 * prompt, imageUrl, hints) — the `answer`, `accepted_variants` and `raw`
 * columns NEVER leave the server. First solve awards tier XP (easy 10 /
 * medium 25 / hard 50) exactly once, atomically.
 *
 * A correct submission of the day's featured puzzle (snapshotted per UTC
 * date in `daily_featured`) bumps `users.streak` exactly once per UTC day:
 * consecutive-day solves increment, a gap resets to 1, and same-day
 * re-submissions are no-ops — while XP stays first-solve-only via
 * `user_puzzle_solves` (re-solves earn daily credit but 0 XP).
 *
 * The answer response also carries the submitting user's post-submission
 * `level`, `streak` and `solvedCount` (M6) so the client can sync every view
 * instantly.
 *
 * Auth is enforced by the global hook (see src/middleware/auth.ts); image
 * files under /puzzles/images/ are served publicly by @fastify/static.
 */

const DAY_MS = 86_400_000;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const feedQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(MAX_LIMIT, `limit must be at most ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
  // Offset pagination carried as a string; anchors on the last nextCursor.
  cursor: z
    .string()
    .regex(/^\d+$/, 'cursor must be a non-negative integer in decimal form')
    .transform((value) => Number.parseInt(value, 10))
    .default('0'),
});

const answerBodySchema = z.object({
  answer: z.string().min(1, 'answer must be at least 1 character').max(500, 'answer must be at most 500 characters'),
  durationMs: z.number().int().min(0).optional(),
});

/** Solved a puzzle: first solve always bumps users.xp exactly once here. */
const XP_BY_LEVEL: Record<PuzzleDifficultyLevel, number> = {
  1: 10,
  3: 25,
  5: 50,
};

const FEED_SQL = `
  SELECT id,
         domain,
         difficulty_level AS "difficultyLevel",
         title,
         prompt,
         image_url        AS "imageUrl",
         hints
    FROM puzzles
   ORDER BY id ASC
   LIMIT $1 + 1
   OFFSET $2
`;

/**
 * Deterministic daily pick: one CTE that both numbers the catalog by id and
 * ships the count alongside the pick (`COUNT(*) OVER ()`) — no separate
 * COUNT round trip, no TOCTOU between count and pick. The snapshot INSERT
 * is a no-op when today's row already exists, so a day's featured puzzle is
 * frozen on first read even as the dataset grows.
 */
const DAILY_SNAPSHOT_SQL = `
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) AS rn,
           COUNT(*) OVER ()                AS "total"
      FROM puzzles
  ),
  picked AS (
    SELECT id
      FROM ranked
     WHERE rn = ($2::bigint % "total") + 1
  )
  INSERT INTO daily_featured (utc_date, puzzle_id)
  SELECT $1::date, id
    FROM picked
  ON CONFLICT (utc_date) DO NOTHING
`;

/** Read today's snapshot back (stable even under concurrent first reads). */
const DAILY_READ_SQL = `
  SELECT f.puzzle_id           AS id,
         p.domain,
         p.difficulty_level    AS "difficultyLevel",
         p.title,
         p.prompt,
         p.image_url           AS "imageUrl",
         p.hints,
         u.last_daily_solve_at AS "lastDailySolveAt"
    FROM daily_featured f
    JOIN puzzles p ON p.id = f.puzzle_id
    LEFT JOIN users u ON u.id = $2
   WHERE f.utc_date = $1
`;

/** Today's snapshot row + the reading user's daily watermark. */
interface DailyRow extends PuzzleRow {
  lastDailySolveAt: Date | null;
}

interface PuzzleRow {
  id: string;
  domain: PuzzleDomain;
  difficultyLevel: number;
  title: string;
  prompt: string;
  imageUrl: string;
  hints: unknown;
}

interface AnsweredPuzzleRow {
  difficulty_level: number;
  answer: string;
  accepted_variants: unknown;
}

function hintsOf(row: PuzzleRow): string[] {
  return Array.isArray(row.hints)
    ? row.hints.filter((hint): hint is string => typeof hint === 'string')
    : [];
}

/**
 * The single row→card mapper — the feed route and the daily route share it
 * so card payloads can never drift (and can never leak answer data).
 */
function toPuzzleCard(row: PuzzleRow): PuzzleCard {
  return {
    id: row.id,
    domain: row.domain,
    difficulty: row.difficultyLevel as PuzzleDifficultyLevel,
    title: row.title,
    prompt: row.prompt,
    imageUrl: row.imageUrl,
    hints: hintsOf(row),
  };
}

/**
 * UTC day bookkeeping for the daily/streak engine. All day boundaries are
 * computed in TS with Date.UTC arithmetic — Postgres `::date` casting is
 * never used for the comparisons because it follows the session timezone.
 */
function utcDayInstants(nowMs: number): {
  epochDays: number;
  /** First millisecond of today, UTC. */
  todayStartMs: number;
  dailyDate: string;
  nextResetAt: string;
} {
  const epochDays = Math.floor(nowMs / DAY_MS);
  const todayStartMs = epochDays * DAY_MS;
  return {
    epochDays,
    todayStartMs,
    dailyDate: new Date(todayStartMs).toISOString().slice(0, 10),
    nextResetAt: new Date(todayStartMs + DAY_MS).toISOString(),
  };
}

/** Post-state parameters of the locked answer transaction. */
interface AnswerStateRow {
  xpAwarded: number;
  xpTotal: number;
  streak: number;
  solvedCount: number;
}

/**
 * Race-safe first-solve XP award (locked transaction).
 *
 * A single INSERT ... ON CONFLICT statement cannot observably tell "first
 * solve via the conflict/update branch" apart from "already solved" — the
 * lifetime `xp_awarded` value returned from the CTE is identical in both
 * cases and RETURNING only exposes post-update values — so awarding exactly
 * once under concurrency is done in three ordered steps on one client:
 *
 *   1. materialize the progress row as a lock anchor (attempts = 0, no-op
 *      when it already exists),
 *   2. `SELECT ... FOR UPDATE` the row: concurrent submissions of the same
 *      (user, puzzle) serialize here, and READ COMMITTED re-reads the latest
 *      committed row, so `alreadySolved` is race-free,
 *   3. bump attempts/first-solve state and users.xp (award = correct &&
 *      !alreadySolved) and report the post-bump xp/streak — all inside one
 *      transaction so a failure rolls everything back,
 *   4. daily credit (M7): snapshot today's featured pick and bump/reset
 *      `users.streak` when this correct submission IS the daily, before the
 *      final users.xp update whose RETURNING exposes the final streak.
 */
export async function puzzleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/puzzles', async (request, reply) => {
    requireUserId(request);
    const { limit, cursor } = parseBody(feedQuerySchema, request.query);

    // One extra row decides whether another page exists after this one.
    const { rows } = await pool.query<PuzzleRow>(FEED_SQL, [limit + 1, cursor]);
    const cards = rows.slice(0, limit).map(toPuzzleCard);

    const body = {
      cards,
      nextCursor: rows.length > limit ? String(cursor + cards.length) : null,
    };
    return reply.code(200).send(body);
  });

  /**
   * GET /puzzles/daily — today's featured puzzle (M7).
   *
   * The pick is `epochDays % puzzleCount` over the id-ordered catalog
   * (epochDays = floor(now UTC ms / 86_400_000)), materialized as a snapshot
   * in `daily_featured` on first read of the day: the INSERT ... ON CONFLICT
   * DO NOTHING freezes the pick, then the row is read BACK from the table so
   * the response always reflects the snapshot, not a fresh recompute.
   */
  app.get('/puzzles/daily', async (request, reply) => {
    const userId = requireUserId(request);
    const { epochDays, todayStartMs, dailyDate, nextResetAt } = utcDayInstants(Date.now());

    // Freeze today's pick (no-op when this UTC day was already snapshotted).
    await pool.query(DAILY_SNAPSHOT_SQL, [dailyDate, epochDays]);
    const { rows } = await pool.query<DailyRow>(DAILY_READ_SQL, [dailyDate, userId]);
    const row = rows[0];
    if (!row) {
      // Empty catalog (or a dangling snapshot): there is no daily puzzle.
      throw new ApiError(404, 'DAILY_UNAVAILABLE', 'No puzzles are available yet');
    }

    // The watermark comparison uses UTC instants passed from TS, never DB
    // `::date` casting (which follows the session timezone).
    const solvedToday =
      row.lastDailySolveAt !== null && row.lastDailySolveAt.getTime() >= todayStartMs;

    const body: DailyResult = {
      dailyDate,
      card: toPuzzleCard(row),
      solvedToday,
      solvedAt: solvedToday ? row.lastDailySolveAt!.toISOString() : null,
      nextResetAt,
    };
    return reply.code(200).send(body);
  });

  app.post<{ Params: { id: string } }>('/puzzles/:id/answer', async (request, reply) => {
    const userId = requireUserId(request);
    const body = parseBody(answerBodySchema, request.body);

    // existence + difficulty + ground truth for the correctAnswer fallback.
    const puzzleId = request.params.id;
    const { rows: puzzleRows } = await pool.query<AnsweredPuzzleRow>(
      `SELECT difficulty_level, answer, accepted_variants
         FROM puzzles
        WHERE id = $1`,
      [puzzleId],
    );
    const puzzle = puzzleRows[0];
    if (!puzzle) {
      throw ApiError.notFound(`Puzzle ${puzzleId} not found`);
    }

    const variants = Array.isArray(puzzle.accepted_variants)
      ? puzzle.accepted_variants.filter((value): value is string => typeof value === 'string')
      : [];
    const correct = isAnswerCorrect(body.answer, variants);
    const reward = XP_BY_LEVEL[(puzzle.difficulty_level as PuzzleDifficultyLevel) ?? 1];

    // M7 day bookkeeping — computed ONCE outside the transaction so every
    // statement inside compares against the same UTC instants.
    const { epochDays, todayStartMs, dailyDate } = utcDayInstants(Date.now());
    const yesterdayStartMs = todayStartMs - DAY_MS;

    const result = await pool.connect().then(async (client) => {
      try {
        await client.query('BEGIN');

        // (1) Lock anchor: create the progress row (no-op if it exists).
        //     attempts starts at 0 and is bumped to >= 1 in step (3).
        await client.query(
          `INSERT INTO user_puzzle_solves (user_id, puzzle_id, attempts)
           VALUES ($1, $2, 0)
           ON CONFLICT (user_id, puzzle_id) DO NOTHING`,
          [userId, puzzleId],
        );

        // (2) Serialize concurrent submissions of the same (user, puzzle);
        //     the row now provably exists. FOR UPDATE re-reads the latest
        //     committed version (READ COMMITTED), so alreadySolved is exact.
        const prior = await client.query<{ alreadySolved: boolean }>(
          `SELECT first_solved_at IS NOT NULL AS "alreadySolved"
             FROM user_puzzle_solves
            WHERE user_id = $1 AND puzzle_id = $2
            FOR UPDATE`,
          [userId, puzzleId],
        );
        const priorRow = prior.rows[0];
        if (!priorRow) {
          throw new ApiError(500, 'INTERNAL_ERROR', 'Puzzle progress row is missing');
        }
        const alreadySolved = priorRow.alreadySolved;
        const award = correct && !alreadySolved ? reward : 0;

        // (3) Record the submission; the FIRST solve of this puzzle sets
        //     first_solved_at and stores the awarded XP on the progress row.
        const solve = await client.query<{ xpAwarded: number }>(
          `UPDATE user_puzzle_solves
              SET attempts          = attempts + 1,
                  last_attempted_at = now(),
                  first_solved_at   = COALESCE(first_solved_at,
                                               CASE WHEN $3 THEN now() END),
                  xp_awarded        = CASE
                                        WHEN $3 AND NOT $4 THEN $5
                                        ELSE xp_awarded
                                      END
            WHERE user_id = $1 AND puzzle_id = $2
           RETURNING xp_awarded AS "xpAwarded"`,
          [userId, puzzleId, correct, alreadySolved, reward],
        );

        // (4) Daily & streak engine (M7): freeze today's featured pick with
        //     the SAME deterministic CTE the daily route uses — a no-op when
        //     it is already snapshotted — so today's submission always scores
        //     against the same featured puzzle even if nobody opened
        //     GET /puzzles/daily today. Then credit the streak when THIS
        //     submission is a CORRECT solve of the featured daily: the WHERE
        //     clause no-ops once the user's watermark is inside today (that
        //     covers same-day re-resolves, while concurrent submits
        //     serialize on the users row lock), CASE bumps on a yesterday
        //     solve and resets to 1 across a gap. Non-daily and incorrect
        //     submissions leave streak/last_daily_solve_at untouched.
        await client.query(DAILY_SNAPSHOT_SQL, [dailyDate, epochDays]);
        const featured = await client.query<{ puzzle_id: string }>(
          'SELECT utc_date, puzzle_id FROM daily_featured WHERE utc_date = $1',
          [dailyDate],
        );
        if (correct && featured.rows[0]?.puzzle_id === puzzleId) {
          await client.query(
            `UPDATE users
                SET streak = CASE
                               WHEN last_daily_solve_at >= $2 AND last_daily_solve_at < $3 THEN streak + 1
                               ELSE 1
                             END,
                    last_daily_solve_at = now()
              WHERE id = $1
                AND (last_daily_solve_at IS NULL OR last_daily_solve_at < $3)`,
            [userId, new Date(yesterdayStartMs).toISOString(), new Date(todayStartMs).toISOString()],
          );
        }

        // Root stats: users.xp grows by the tier reward on the first solve
        // only; step (4) above already wrote today's streak credit, so the
        // RETURNING here exposes the FINAL post-credit streak. The post-update
        // row ALSO reports solvedCount so the client can sync every view
        // immediately without a follow-up /profile round trip. The count
        // subquery sees the row state this transaction just committed (it
        // counts first_solved_at IS NOT NULL — the COALESCE above already
        // set it on a first solve).
        const users = await client.query<{ xp: number; streak: number; solved_count: number }>(
          `UPDATE users
              SET xp = xp + $2
            WHERE id = $1
           RETURNING xp,
                     streak,
                     (SELECT COUNT(*)::int
                        FROM user_puzzle_solves s
                       WHERE s.user_id = users.id
                         AND s.first_solved_at IS NOT NULL) AS solved_count`,
          [userId, award],
        );
        await client.query('COMMIT');

        const solveRow = solve.rows[0];
        const userRow = users.rows[0];
        if (!solveRow || !userRow) {
          // Authenticated user vanished mid-request — treat as 401.
          throw new ApiError(401, 'UNAUTHORIZED', 'Account no longer exists');
        }
        // xpAwarded reports THIS submission's award (0 on re-submits); the
        // progress row keeps the lifetime total for future stats (M7/stats).
        // level is derived from the SAME shared threshold helper used by
        // toUser — duplicated logic is forbidden across M-types.
        return {
          xpAwarded: award,
          xpTotal: userRow.xp,
          streak: userRow.streak,
          level: levelFromXp(userRow.xp),
          solvedCount: userRow.solved_count ?? 0,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    const payload: AnswerResult = {
      correct,
      xpAwarded: result.xpAwarded,
      xpTotal: result.xpTotal,
      streak: result.streak,
      level: result.level,
      solvedCount: result.solvedCount,
    };
    // correctAnswer is ONLY exposed on an incorrect submission.
    if (!correct) {
      payload.correctAnswer = puzzle.answer;
    }
    return reply.code(200).send(payload);
  });
}
