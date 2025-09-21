// apps/api/src/module/system/system.router.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export const systemRouter = Router();
const logger = new Logger('SystemRouter');

// NOTE: This router creates its own PrismaClient and Redis client like your Nest controller did.
// In a larger refactor you may want to reuse a single Prisma/Redis instance across routers.
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || '');

systemRouter.get('/health', async (_req: Request, res: Response) => {
  const results: any = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  // DB check
  try {
    // same call style as the original controller
    await prisma.$queryRaw`SELECT 1`;
    results.database = 'ok';
  } catch (err: any) {
    logger.warn('Database health check failed', err);
    results.database = 'error';
    results.databaseError = err instanceof Error ? err.message : String(err);
    results.status = 'degraded';
  }

  // Redis check
  try {
    const pong = await redis.ping();
    results.redis = pong === 'PONG' ? 'ok' : 'error';
  } catch (err: any) {
    logger.warn('Redis health check failed', err);
    results.redis = 'error';
    results.redisError = err instanceof Error ? err.message : String(err);
    results.status = 'degraded';
  }

  // choose status code: 200 when ok/partial; 503 when degraded? We'll return 200 for checks but include status.
  // If you prefer non-2xx for degraded, change to res.status(503).
  res.status(results.status === 'ok' ? 200 : 200).json(results);
});

