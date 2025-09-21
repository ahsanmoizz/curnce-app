import { Router } from 'express';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';

export function createAnalyticsRouter() {
  const router = Router();

  const prisma = new PrismaService();
  const analytics = new AnalyticsService(prisma);
  const audit = new AuditService(prisma);

  // helper: resolve tenant id
  function resolveTenantId(req: any, override?: string) {
    const role = (req.user?.role || req.user?.roles || '').toString().toUpperCase();
    const isAdmin = role.includes('ADMIN') || role.includes('OWNER');
    if (override && override !== 'me') {
      if (!isAdmin) throw new Error('Not allowed to access other tenants');
      return override;
    }
    return req.user.tenantId;
  }

  // helper: rate limiter
  const rateBucket = new Map<string, number[]>();
  function rateLimitCheck(tenantId: string) {
    const WINDOW = 60_000;
    const LIMIT = 10;
    const now = Date.now();
    const arr = rateBucket.get(tenantId) || [];
    const pruned = arr.filter((t) => now - t < WINDOW);
    if (pruned.length >= LIMIT) {
      throw new Error('Rate limit exceeded');
    }
    pruned.push(now);
    rateBucket.set(tenantId, pruned);
  }

  router.use(jwtMiddleware);

  // 📊 Payments
  router.get('/payments', async (req: any, res) => {
    try {
      const tenantId = resolveTenantId(req, req.query.tenantId as string);
      rateLimitCheck(tenantId);
      const data = await analytics.getPaymentStats(tenantId);
      await audit.logAction({
        tenantId,
        userId: req.user.id || req.user.userId || 'system',
        action: 'ANALYTICS_VIEWED',
        details: { area: 'payments' },
      });
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 📊 Ledger
  router.get('/ledger', async (req: any, res) => {
    try {
      const tenantId = resolveTenantId(req, req.query.tenantId as string);
      rateLimitCheck(tenantId);
      const data = await analytics.getLedgerSummary(tenantId);
      await audit.logAction({
        tenantId,
        userId: req.user.id || req.user.userId || 'system',
        action: 'ANALYTICS_VIEWED',
        details: { area: 'ledger' },
      });
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 📊 Compliance
  router.get('/compliance', async (req: any, res) => {
    try {
      const tenantId = resolveTenantId(req, req.query.tenantId as string);
      rateLimitCheck(tenantId);
      const data = await analytics.getComplianceStats(tenantId);
      await audit.logAction({
        tenantId,
        userId: req.user.id || req.user.userId || 'system',
        action: 'ANALYTICS_VIEWED',
        details: { area: 'compliance' },
      });
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
