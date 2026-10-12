import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';

interface UserProfile {
  id: string;
  displayName: string;
  audienceCategory: 'CHILDREN' | 'TEENS';
  createdAt: string;
}

export class ProfileService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, audienceCategory: true, createdAt: true }
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'SCOPE_NOT_FOUND' });
    }

    return {
      id: user.id,
      displayName: user.displayName,
      audienceCategory: user.audienceCategory,
      createdAt: user.createdAt.toISOString()
    };
  }

  async updateProfile(userId: string, displayName: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { displayName },
      select: { id: true, displayName: true, audienceCategory: true, createdAt: true }
    });

    return {
      id: user.id,
      displayName: user.displayName,
      audienceCategory: user.audienceCategory,
      createdAt: user.createdAt.toISOString()
    };
  }
}