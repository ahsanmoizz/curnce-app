// apps/api/src/module/payments/payments.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { PaymentsService } from './payments.service';
import { ExportService } from '../exports/exports.service';
import { AuditService } from '../audit/audit.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';
import { PaymentFilterDto } from '../exports/dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ComplianceService } from '../compliance/compliance.service';
import { AIService } from '../ai/ai.service';   // ✅ import AIService
import { AiLegalService } from '../ai-legal/ai-legal.service';
export const paymentsRouter = Router();

// --- Initialize services in correct order ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const aiService = new AIService();   // no args
const aiLegal = new AiLegalService(prisma);
const notifications = new NotificationsService(prisma, auditService);

// Ledger takes (prisma, audit, notifications)
const ledger = new LedgerService(prisma, auditService, notifications);

// Blockchain needs (prisma, audit)
const blockchain = new BlockchainService(prisma, auditService);

// Compliance needs (prisma, audit, ai, ledger, blockchain, notifications)
const compliance = new ComplianceService(
  prisma,
  aiService,
  auditService,
  notifications,
  aiLegal
);

// Exporter instance
const exporter = new ExportService();

// Payments service wires everything
const paymentsService = new PaymentsService(
  prisma,
  blockchain,
  ledger,
  auditService,
  notifications,
  compliance
);
// --- Middleware ---
paymentsRouter.use(JwtGuard);

// ----------------- PAYMENT INTENTS -----------------
paymentsRouter.post('/intent', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const dto = req.body;
    const intent = await paymentsService.createIntent(user.tenantId, dto);
    res.json(intent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- LIST PAYMENTS -----------------
paymentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { status, fromDate, toDate, page = '1', limit = '20' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { tenantId: user.tenantId };
    if (status) where.status = status;
    if (fromDate && toDate) where.createdAt = { gte: new Date(fromDate), lte: new Date(toDate) };

    const [items, total] = await prisma.$transaction([
      prisma.paymentIntent.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentIntent.count({ where }),
    ]);
    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- SUMMARY -----------------
paymentsRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const tenantId = user.tenantId;

    const [total, released, refunded] = await Promise.all([
      prisma.paymentIntent.count({ where: { tenantId } }),
      prisma.paymentIntent.aggregate({ _sum: { amount: true }, where: { tenantId, status: 'released' } }),
      prisma.paymentIntent.aggregate({ _sum: { amount: true }, where: { tenantId, status: 'refunded' } }),
    ]);

    res.json({ total, releasedSum: released._sum.amount ?? 0, refundedSum: refunded._sum.amount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- STATS -----------------
paymentsRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const tenantId = user.tenantId;

    const rows: Array<{ month: string; amount: number }> = await prisma.$queryRawUnsafe(
      `
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
             COALESCE(SUM(CAST("amount" AS numeric)), 0) AS amount
      FROM "PaymentIntent"
      WHERE "tenantId" = $1
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      tenantId,
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- EXPORT PAYMENTS -----------------
paymentsRouter.get('/export', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const filters: PaymentFilterDto = req.query as any;

    const {
      status, tenantId, q, dateFrom, dateTo,
      format = 'csv',
    } = filters;

    const where: any = {
      tenantId: tenantId || user.tenantId,
      status: status || undefined,
      createdAt: (dateFrom || dateTo) ? {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
    if (q) {
      where.OR = [
        { paymentId: { contains: q, mode: 'insensitive' } },
        { currency: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.paymentIntent.findMany({ where, orderBy: { createdAt: 'desc' } });
    const buffer = await exporter.generate(items, format as any);

    await auditService.logAction({
      tenantId: user.tenantId,
      userId: user.id || user.userId || 'system',
      action: 'ADMIN_EXPORT_PAYMENTS',
      details: { filters, count: items.length, format },
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.${format}`);
    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- DYNAMIC ROUTES (must come after!) -----------------
paymentsRouter.get('/:paymentId/status', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { paymentId } = req.params;
    const status = await paymentsService.getStatus(user.tenantId, paymentId);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

paymentsRouter.patch('/:paymentId/release', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { paymentId } = req.params;
    const result = await paymentsService.release(user.tenantId, paymentId, user.id || user.userId || 'system');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

paymentsRouter.patch('/:paymentId/refund', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { paymentId } = req.params;
    const result = await paymentsService.refund(user.tenantId, paymentId, user.id || user.userId || 'system');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

paymentsRouter.post('/:paymentId/force-cancel', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { paymentId } = req.params;
    const result = await paymentsService.forceCancel(user.tenantId, paymentId, user.id || user.userId || 'system');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

paymentsRouter.post('/:paymentId/freeze', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { paymentId } = req.params;
    const result = await paymentsService.freeze(user.tenantId, paymentId, user.id || user.userId || 'system');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
