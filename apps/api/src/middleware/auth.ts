import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ApiError } from '../errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the auth hook for authenticated requests (`payload.sub`). */
    userId?: string;
  }
}

/** Routes reachable without a bearer token. Everything else requires JWT. */
const PUBLIC_ROUTES = new Set([
  'GET /health',
  'POST /auth/signup',
  'POST /auth/login',
]);

/**
 * Public URL prefixes (M5): static puzzle images carry a relative path the
 * client prefixes with its API base URL, so they must be served without a
 * token. Exact public routes stay in the set above; nothing else is opened.
 */
const PUBLIC_PREFIXES = ['/puzzles/images/'];

/**
 * Global `onRequest` hook: public allowlist passes through, everything else
 * must carry `Authorization: Bearer <token>`; on success `request.userId`
 * is set from the JWT `sub` claim.
 */
export async function authHook(request: FastifyRequest): Promise<void> {
  const routeKey = `${request.method} ${request.routeOptions.url ?? request.url}`;
  if (PUBLIC_ROUTES.has(routeKey)) return;

  // Static puzzle images are anonymous (see PUBLIC_PREFIXES above).
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    PUBLIC_PREFIXES.some((prefix) => request.url.startsWith(prefix))
  ) {
    return;
  }

  try {
    const payload = await request.jwtVerify<{ sub?: string }>();
    if (!payload.sub) {
      throw ApiError.unauthorized('UNAUTHORIZED', 'Token is missing a subject');
    }
    request.userId = payload.sub;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Any jwtVerify failure (missing header, malformed/invalid/expired token)
    // collapses into the same 401 — no token details leak to the client.
    throw ApiError.unauthorized(
      'UNAUTHORIZED',
      'Missing, invalid or expired authentication token',
    );
  }
}

/** Registers the global auth hook. Must run before routes are registered. */
export function registerAuth(app: FastifyInstance): void {
  app.addHook('onRequest', authHook);
}

/** Returns the authenticated user id or throws 401 (defensive). */
export function requireUserId(request: FastifyRequest): string {
  if (!request.userId) {
    throw ApiError.unauthorized('UNAUTHORIZED', 'Authentication required');
  }
  return request.userId;
}
