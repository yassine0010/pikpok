import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireUserId } from '../middleware/auth.js';
import { parseBody } from '../lib/validate.js';
import { toUser, USER_COLUMNS, type UserRow } from '../lib/user.js';

const patchProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(30).optional(),
    age: z.number().int().min(6).max(120).optional(),
  })
  .refine((value) => value.displayName !== undefined || value.age !== undefined, {
    message: 'Provide at least one field to update',
  });

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/profile', async (request, reply) => {
    const userId = requireUserId(request);
    const result = await pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Account no longer exists');
    }
    return reply.code(200).send({ user: toUser(row) });
  });

  app.patch('/profile', async (request, reply) => {
    const userId = requireUserId(request);
    const body = parseBody(patchProfileSchema, request.body);

    const result = await pool.query<UserRow>(
      `UPDATE users
          SET display_name = COALESCE($1, display_name),
              age          = COALESCE($2, age)
        WHERE id = $3
        RETURNING ${USER_COLUMNS}`,
      [body.displayName ?? null, body.age ?? null, userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Account no longer exists');
    }
    return reply.code(200).send({ user: toUser(row) });
  });
}
