import { Router } from 'express';
import { PrismaService } from '../../prisma.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { AuditService } from './audit.service';
import { ExportService } from '../exports/exports.service';

const auditRouter = Router();
const prisma = new PrismaService();
const audit = new AuditService(prisma);
const exporter = new ExportService();

// GET /v1/audit
auditRouter.get('/audit', JwtGuard, async (req: any, res, next) => {
  try {
    const { action, userId, fromDate, toDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: req.user.tenantId };

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (fromDate && toDate) {
      where.createdAt = {
        gte: new Date(fromDate as string),
        lte: new Date(toDate as string),
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/audit/export
auditRouter.get('/audit/export', JwtGuard, async (req: any, res, next) => {
  try {
    const { type, q, dateFrom, dateTo, format = 'csv' } = req.query as any;

    const where: any = {
      tenantId: req.user.tenantId,
      action: type || undefined,
      createdAt:
        dateFrom || dateTo
          ? {
              gte: dateFrom ? new Date(dateFrom) : undefined,
              lte: dateTo ? new Date(dateTo) : undefined,
            }
          : undefined,
    };

    if (q) {
      where.OR = [
        { userId: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const buffer = await exporter.generate(items, format);

    await audit.logAction({
     tenantId: req.user.tenantId,
      userId: req.user.id || req.user.userId || 'system',
      action: 'ADMIN_EXPORT_AUDIT',
      details: { filters: req.query, count: items.length, format, sensitive: true },
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', `attachment; filename=audit-${Date.now()}.${format}`);
    res.end(buffer);
  } catch (err) {
    next(err);
  }
});
auditRouter.post('/audit/tx', JwtGuard, async (req: any, res, next) => {
  try {
    const { reason, sender, recipient, chain, amount, txHash } = req.body;
    if ( !recipient || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = await audit.logAction({
      tenantId: req.user.tenantId,
      userId: req.user.id || req.user.userId || 'system',
      action: 'TX_SENT',
      details: { reason, sender, recipient, chain, amount, txHash },
      ip: req.ip,
    });

    res.json(entry);
  } catch (err) {
    next(err);
  }
});
auditRouter.put('/audit/tx', JwtGuard, async (req: any, res, next) => {
  try {
    const { recipient, amount, reason, chain, txHash } = req.body;
    if (!recipient || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = await audit.logAction({
      tenantId: req.user.tenantId,
      userId: req.user.id || req.user.userId || 'system',
      action: 'TX_SENT',
      details: { reason, recipient, amount, chain, txHash },
      ip: req.ip,
    });

    res.json(entry);
  } catch (err) {
    next(err);
  }
});

export { auditRouter };
