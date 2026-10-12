import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '@utils/config';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({ err: error }, 'Request error');

  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation
      }
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.flatten()
      }
    });
  }

  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.message
      }
    });
  }

  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing, invalid, or expired token'
      }
    });
  }

  if (error.statusCode === 403) {
    return reply.status(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
    });
  }

  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: {
        code: 'SCOPE_NOT_FOUND',
        message: 'Resource not found'
      }
    });
  }

  if (error.statusCode === 409) {
    return reply.status(409).send({
      error: {
        code: 'CONFLICT',
        message: error.message
      }
    });
  }

  if (error.statusCode === 422) {
    return reply.status(422).send({
      error: {
        code: 'UNSUPPORTED_AUDIENCE_CATEGORY',
        message: error.message
      }
    });
  }

  if (error.statusCode === 503) {
    return reply.status(503).send({
      error: {
        code: 'QUEUE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please retry.'
      }
    });
  }

  if (error.code === 'P2003' || error instanceof Prisma.PrismaClientKnownRequestError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database constraint violation',
        details: config.nodeEnv === 'development' ? error.message : undefined
      }
    });
  }

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? error.message : 'An unexpected error occurred',
      details: config.nodeEnv === 'development' ? error.stack : undefined
    }
  });
}