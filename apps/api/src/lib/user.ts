/** Columns selected whenever a full user row is needed. */
export const USER_COLUMNS = 'id, email, display_name, age, xp, streak';

/** Raw `users` row as returned by PostgreSQL (snake_case). */
export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  age: number | null;
  xp: number;
  streak: number;
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
  };
}
