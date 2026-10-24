import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = await buildApp({ logger: false });

afterAll(async () => {
  await app.close();
  await pool.end();
});

// Unique suffix so repeated local runs never collide on the unique email index.
const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const uniqueEmail = (label: string) => `${label}-${runId}@example.com`;

const USER_KEYS = ['age', 'displayName', 'email', 'id', 'level', 'solvedCount', 'streak', 'xp'];

describe('GET /health', () => {
  it('returns 200 ok without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('POST /auth/signup', () => {
  it('creates an account and returns token + user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        displayName: '  Alex  ',
        email: 'Alex.Smith@Example.COM',
        password: 'supersecret1',
        age: 24,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { token: string; user: Record<string, unknown> };
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(10);

    // Exact contract shape — camelCase, level computed, no password hash.
    expect(Object.keys(body.user).sort()).toEqual(USER_KEYS);
    expect(body.user.displayName).toBe('Alex'); // trimmed
    expect(body.user.email).toBe('alex.smith@example.com'); // lowercased
    expect(body.user.age).toBe(24);
    expect(body.user.xp).toBe(0);
    expect(body.user.streak).toBe(0);
    expect(body.user.level).toBe(1);
    expect(body.user.solvedCount).toBe(0); // fresh account, no solves
    expect(body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(JSON.stringify(body.user)).not.toContain('password');
  });

  it('rejects a duplicate email with 409 EMAIL_ALREADY_REGISTERED', async () => {
    const email = uniqueEmail('dup');
    const payload = { displayName: 'Dup', email, password: 'supersecret1', age: 30 };

    const first = await app.inject({ method: 'POST', url: '/auth/signup', payload });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({ method: 'POST', url: '/auth/signup', payload });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({
      error: { code: 'EMAIL_ALREADY_REGISTERED', message: expect.any(String) },
    });
  });

  it('rejects invalid payloads with 400 VALIDATION_ERROR + details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { displayName: 'X', email: 'not-an-email', password: 'short', age: 3 },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string; details: unknown[] } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details.length).toBeGreaterThan(0);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    const email = uniqueEmail('login-ok');
    const password = 'supersecret1';
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { displayName: 'Logan', email, password, age: 21 },
    });
    expect(signup.statusCode).toBe(201);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; user: Record<string, unknown> };
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe(email);
    expect(Object.keys(body.user).sort()).toEqual(USER_KEYS);
  });

  it('returns 401 INVALID_CREDENTIALS for a wrong password', async () => {
    const email = uniqueEmail('login-bad');
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { displayName: 'Badder', email, password: 'supersecret1', age: 21 },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrong-password-1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  });

  it('returns the same 401 for an unknown email (no user enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: uniqueEmail('nobody'), password: 'whatever-here' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  });
});

describe('GET /profile', () => {
  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/profile' });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a garbage token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Bearer not.a.valid.token' },
    });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it("returns the user's own profile with a valid token", async () => {
    const email = uniqueEmail('profile');
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { displayName: 'Piper', email, password: 'supersecret1', age: 33 },
    });
    const { token, user } = signup.json() as { token: string; user: Record<string, unknown> };

    const res = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { user: Record<string, unknown> };
    expect(body.user).toEqual(user);
    expect(Object.keys(body.user).sort()).toEqual(USER_KEYS);
  });
});

describe('PATCH /profile', () => {
  it('updates displayName and age', async () => {
    const email = uniqueEmail('patch');
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { displayName: 'Old Name', email, password: 'supersecret1', age: 40 },
    });
    const { token } = signup.json() as { token: string };

    const res = await app.inject({
      method: 'PATCH',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: 'New Name', age: 41 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { user: Record<string, unknown> };
    expect(body.user.displayName).toBe('New Name');
    expect(body.user.age).toBe(41);
    expect(body.user.email).toBe(email);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/profile',
      payload: { displayName: 'Nope' },
    });
    expect(res.statusCode).toBe(401);
  });
});
