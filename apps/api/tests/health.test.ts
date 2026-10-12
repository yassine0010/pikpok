import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../src/server';

describe('Health Check', () => {
  it('should return ok status', async () => {
    const server = await buildServer();
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
    await server.close();
  });
});