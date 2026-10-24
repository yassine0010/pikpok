/**
 * Columns selected whenever a full user row is needed. `solved_count` is a
 * per-row scalar subquery (COUNT of this user's puzzles that have actually
 * been solved — `first_solved_at` is set), so it stays correct wherever the
 * user row is read. PostgreSQL 16 allows this subquery inside
 * INSERT/UPDATE ... RETURNING too, so signup/patch flow through unchanged.
 */
export const USER_COLUMNS = `id,
       email,
       display_name,
       age,
       xp,
       streak,
       (SELECT COUNT(*)::int
          FROM user_puzzle_solves s
         WHERE s.user_id = users.id
           AND s.first_solved_at IS NOT NULL) AS solved_count`;

/** Raw `users` row as returned by PostgreSQL (snake_case). */
export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  age: number | null;
  xp: number;
  streak: number;
  solved_count: number;
}

/** Public JSON shape of a user — camelCase, never includes password_hash. */
export interface User {
  id: string;
  email: string;
  displayName: string;
  age: number | null;
  xp: number;
  streak: number;
  level: number;
  solvedCount: number;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 1000) + 1;
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    age: row.age,
    xp: row.xp,
    streak: row.streak,
    level: levelFromXp(row.xp),
    solvedCount: row.solved_count ?? 0,
  };
}
