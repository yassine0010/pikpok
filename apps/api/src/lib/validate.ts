import { z } from 'zod';
import { ApiError } from '../errors.js';

function toDetails(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/** Parse a request body with zod, mapping failures to 400 VALIDATION_ERROR. */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw ApiError.badRequest(
      'VALIDATION_ERROR',
      'Request validation failed',
      toDetails(result.error),
    );
  }
  return result.data;
}
