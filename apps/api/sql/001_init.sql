-- 001_init.sql — M2: user accounts.
-- Direct SQL, no ORM. PostgreSQL 16 (gen_random_uuid() is built in).

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  age           INTEGER,
  xp            INTEGER NOT NULL DEFAULT 0,
  streak        INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lowercase_check
    CHECK (email = lower(email)),
  CONSTRAINT users_email_not_empty_check
    CHECK (char_length(btrim(email)) > 0),
  CONSTRAINT users_display_name_length_check
    CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 30),
  -- Age is profile information only; it never restricts access.
  -- The check merely keeps stored values sane (same range as API validation).
  CONSTRAINT users_age_range_check
    CHECK (age IS NULL OR (age >= 6 AND age <= 120)),
  CONSTRAINT users_xp_non_negative_check
    CHECK (xp >= 0),
  CONSTRAINT users_streak_non_negative_check
    CHECK (streak >= 0)
);

-- Emails are stored lowercase by the app; the unique index guarantees uniqueness.
CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
