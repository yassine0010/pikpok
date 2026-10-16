import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { ApiError, isUniqueViolation } from '../errors.js';
import { parseBody } from '../lib/validate.js';
import { toUser, USER_COLUMNS, type UserRow } from '../lib/user.js';

const BCRYPT_ROUNDS = 12;

const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Must be a valid email address')
    .max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
  // Profile information only — required at signup, never used to restrict access.
  age: z.number().int().min(6).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email address').max(254),
  password: z.string().min(1).max(72),
});

/** Lazily built dummy hash so unknown-email logins cost the same as real ones. */
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (dummyHash === null) {
    dummyHash = await bcrypt.hash('timing-equalization-placeholder', BCRYPT_ROUNDS);
  }
  return dummyHash;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/signup', async (request, reply) => {
    const body = parseBody(signupSchema, request.body);
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    let row: UserRow;
    try {
      const result = await pool.query<UserRow>(
        `INSERT INTO users (email, display_name, password_hash, age)
         VALUES ($1, $2, $3, $4)
         RETURNING ${USER_COLUMNS}`,
        [body.email, body.displayName, passwordHash, body.age],
      );
      row = result.rows[0]!;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists',
        );
      }
      throw error;
    }

    const user = toUser(row);
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: config.jwtExpiresIn });
    return reply.code(201).send({ token, user });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = parseBody(loginSchema, request.body);

    const result = await pool.query<UserRow & { password_hash: string }>(
      `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
      [body.email],
    );
    const row = result.rows[0];

    // Same response for unknown email and wrong password: no user enumeration.
    if (!row) {
      await bcrypt.compare(body.password, await getDummyHash());
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const valid = await bcrypt.compare(body.password, row.password_hash);
    if (!valid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = toUser(row);
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: config.jwtExpiresIn });
    return reply.code(200).send({ token, user });
  });
}
