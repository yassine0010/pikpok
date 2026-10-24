-- 002_puzzles.sql — M5: interactive puzzle feed.
-- Direct SQL, no ORM. Catalog rows come from the JSON question bank via
-- `npm run db:import-puzzles` (see src/db/import-puzzles.ts); player progress
-- is tracked per (user, puzzle) in a single row.

-- CHECK helpers (subqueries are not allowed inline, so the element rules are
-- wrapped here). IMMUTABLE so it is valid inside a check constraint.
CREATE OR REPLACE FUNCTION jsonb_array_all_strings(value jsonb) RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  AS $$
    SELECT NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(value) AS element
       WHERE jsonb_typeof(element) <> 'string'
    )
  $$;

CREATE TABLE puzzles (
  id                TEXT PRIMARY KEY,
  -- Feed-facing fields (everything the client sees must be derivable from
  -- these columns alone; `raw` is source archive data, never exposed).
  domain            TEXT NOT NULL,
  difficulty        TEXT NOT NULL,
  difficulty_level  INTEGER NOT NULL,
  title             TEXT NOT NULL,
  prompt            TEXT NOT NULL,
  hints             JSONB NOT NULL,
  -- Answer data (never returned to clients; only used server-side).
  answer            TEXT NOT NULL,
  accepted_variants JSONB NOT NULL,
  -- Relative public path, served by @fastify/static under /puzzles/images/.
  image_url         TEXT NOT NULL,
  -- Full source JSON for future use (analytics, hints, stats, ...).
  raw               JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT puzzles_domain_check
    CHECK (domain IN ('math', 'logic', 'pattern', 'words')),
  CONSTRAINT puzzles_difficulty_check
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT puzzles_difficulty_level_check
    CHECK (difficulty_level IN (1, 3, 5)),
  CONSTRAINT puzzles_title_length_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  CONSTRAINT puzzles_prompt_not_empty_check
    CHECK (char_length(btrim(prompt)) > 0),
  -- hints: JSON array of 0..5 strings. (CHECKs cannot contain subqueries, so
  -- the element-type rule lives in the immutable helper below.)
  CONSTRAINT puzzles_hints_shape_check
    CHECK (
      jsonb_typeof(hints) = 'array'
      AND jsonb_array_length(hints) <= 5
      AND jsonb_array_all_strings(hints)
    ),
  -- accepted_variants: JSON array of 1..N strings (pre-normalized answers).
  CONSTRAINT puzzles_accepted_variants_shape_check
    CHECK (
      jsonb_typeof(accepted_variants) = 'array'
      AND jsonb_array_length(accepted_variants) >= 1
      AND jsonb_array_all_strings(accepted_variants)
    )
);

-- Simple feed filters; the ordered feed itself is id-ordered.CREATE INDEX puzzles_difficulty_level_idx ON puzzles (difficulty_level);
CREATE INDEX puzzles_domain_idx ON puzzles (domain);

-- One row per (user, puzzle): submissions so far and whether/when it was
-- first solved. XP is awarded exactly once, on the first correct submit.
--
-- The answer route creates the row with attempts = 0 as a lock anchor before
-- re-reading it with `SELECT ... FOR UPDATE` (a no-op insert when it already
-- exists), then bumps attempts to >= 1 for the real submission — see
-- src/routes/puzzles.ts. Hence the >= 0 check, not > 0.
CREATE TABLE user_puzzle_solves (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id         TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  attempts          INTEGER NOT NULL DEFAULT 1,
  xp_awarded        INTEGER NOT NULL DEFAULT 0,
  first_solved_at   TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_id),
  CONSTRAINT user_puzzle_solves_attempts_non_negative_check
    CHECK (attempts >= 0),
  CONSTRAINT user_puzzle_solves_xp_awarded_non_negative_check
    CHECK (xp_awarded >= 0)
);

-- Future aggregate stats per puzzle.
CREATE INDEX user_puzzle_solves_puzzle_id_idx ON user_puzzle_solves (puzzle_id);
