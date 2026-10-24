-- 003_daily_streaks.sql — M7: daily puzzle & streak engine.
-- Direct SQL, no ORM. The daily featured pick is SNAPSHOT per UTC date so a
-- given day always serves the same puzzle even if the catalog grows later,
-- and `users.last_daily_solve_at` becomes the watermark the streak engine
-- compares UTC-day instants against (all day boundaries are computed in TS
-- with Date.UTC — never via DB `::date`, which follows the session TZ).

ALTER TABLE users ADD COLUMN last_daily_solve_at TIMESTAMPTZ;

-- One row per UTC date. `puzzle_id` references the puzzle featured that day;
-- `featured_at` records when the snapshot row was first materialized.
CREATE TABLE daily_featured (
  utc_date    DATE PRIMARY KEY,
  puzzle_id   TEXT NOT NULL REFERENCES puzzles(id),
  featured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily reads/scoring filter by the exact current utc_date (primary key
-- lookup), so no additional index is needed.
