import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

/**
 * Deterministic, idempotent dev seed for the M3 leaderboard demo.
 *
 * Inserts eight demo players with fixed xp/streak values so the leaderboard
 * has something to show before real players exist. Re-running is safe: the
 * ON CONFLICT clause refreshes each demo user back to the seeded values.
 *
 * Runs against whatever DATABASE_URL the config resolves (dev DB via
 * `npm run db:seed`; it also works if DATABASE_URL points elsewhere, e.g.
 * pikpok_test — but it is only wired as a dev script).
 */

/** The single password every demo account uses. Dev-only, intentionally fake. */
const DEMO_PASSWORD = 'demo-password-123';
const BCRYPT_ROUNDS = 12;

interface SeedUser {
  displayName: string;
  email: string;
  xp: number;
  streak: number;
}

const DEMO_USERS: readonly SeedUser[] = [
  { displayName: 'Elena Rostova', email: 'demo1@pikpok.dev', xp: 3420, streak: 28 },
  { displayName: 'Marcus Vance', email: 'demo2@pikpok.dev', xp: 2890, streak: 19 },
  { displayName: 'Sofia Chen', email: 'demo3@pikpok.dev', xp: 2410, streak: 14 },
  { displayName: 'Alex Rivers', email: 'demo4@pikpok.dev', xp: 1450, streak: 12 },
  { displayName: 'Tariq Al-Mansoor', email: 'demo5@pikpok.dev', xp: 1320, streak: 9 },
  { displayName: 'Priya Nair', email: 'demo6@pikpok.dev', xp: 980, streak: 6 },
  { displayName: 'Jonas Weber', email: 'demo7@pikpok.dev', xp: 640, streak: 4 },
  { displayName: 'Camille Dubois', email: 'demo8@pikpok.dev', xp: 310, streak: 2 },
];

async function main(): Promise<void> {
  console.log(`Seeding ${DEMO_USERS.length} demo users...`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  for (const user of DEMO_USERS) {
    const { rowCount } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash, xp, streak)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
              SET display_name  = EXCLUDED.display_name,
                  password_hash = EXCLUDED.password_hash,
                  xp            = EXCLUDED.xp,
                  streak        = EXCLUDED.streak`,
      [user.email, user.displayName, passwordHash, user.xp, user.streak],
    );
    console.log(`  ok (${rowCount === 1 ? 'inserted or refreshed' : 'no-op'}): ${user.email}`);
  }

  console.log('');
  console.log('Demo accounts are ready. Log in with any of:');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email}`);
  }
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
