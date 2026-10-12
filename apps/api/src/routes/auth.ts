import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@services/prisma';
import { config } from '@utils/config';

const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(72),
  audienceCategory: z.enum(['CHILDREN', 'TEENS'])
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['displayName', 'email', 'password', 'audienceCategory'],
        properties: {
          displayName: { type: 'string', minLength: 2, maxLength: 30 },
          email: { type: 'string', format: 'email', maxLength: 320 },
          password: { type: 'string', minLength: 8, maxLength: 72 },
          audienceCategory: { type: 'string', enum: ['CHILDREN', 'TEENS'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                displayName: { type: 'string' },
                audienceCategory: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = signupSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.status(409).send({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email already registered' }
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        audienceCategory: data.audienceCategory,
        stats: { create: {} }
      },
      select: { id: true, displayName: true, audienceCategory: true, createdAt: true }
    });

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: config.jwt.expiresIn });

    return reply.status(201).send({ token, user });
  });

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                displayName: { type: 'string' },
                audienceCategory: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const token = fastify.jwt.sign({ sub: user.id }, { expiresIn: config.jwt.expiresIn });

    return reply.send({
      token,
      user: { id: user.id, displayName: user.displayName, audienceCategory: user.audienceCategory, createdAt: user.createdAt.toISOString() }
    });
  });
}