// apps/api/src/module/ledger/ledger.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { LedgerService } from './ledger.service';
import { AuditService } from '../audit/audit.service';
import { ExportService } from '../exports/exports.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';
import { TransactionCreateSchema } from '@ufa/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerFilterDto } from '../exports/dto';
import { NotificationsService } from '../notifications/notifications.service';

export const ledgerRouter = Router();

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const notificationsService = new NotificationsService(prisma, auditService);
const ledgerService = new LedgerService(prisma, auditService, notificationsService);
const exporter = new ExportService();

ledgerRouter.use(JwtGuard);

// ---------- TRANSACTIONS ----------
ledgerRouter.post('/transactions', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const sumDebit = data.entries.reduce((s, e) => s + e.debit, 0);
    const amount = new Decimal(sumDebit);

    const result = await prisma.$transaction(async (tx) => {
      // --- Branch safe resolve ---
     let branchId: string | null = null;
if (data.branchId) {
  let branch = await tx.branch.findUnique({ where: { id: data.branchId } });
  if (!branch) {
    // auto create branch if not exist
    branch = await tx.branch.create({
      data: { id: data.branchId, tenantId: (req.user as any).tenantId, name: data.branchId },
    });
  }
  branchId = branch.id;
}

  const accounts = await tx.account.findMany({
  where: { tenantId: (req.user as any).tenantId },
});
const accountMap = new Map(accounts.map((a) => [a.code, a]));
      // --- Create transaction ---
      const t = await tx.transaction.create({
        data: {
          tenantId: (req.user as any).tenantId,
          branchId,
          externalId: data.externalId || null,
          description: data.description || "",
          source: data.source || "manual",
          occurredAt: new Date(data.occurredAt),
          amount,
          currency: data.currency,
        },
      });

      // --- Create entries ---
    await tx.entry.createMany({
  data: data.entries.map((e: any) => ({
    tenantId: (req.user as any).tenantId,
    transactionId: t.id,
    accountId: accountMap.get(e.accountCode)!.id, // ✅ FIXED
    debit: new Decimal(e.debit.toFixed(2)),
    credit: new Decimal(e.credit.toFixed(2)),
    currency: e.currency,
  })),
});

      // ✅ return transaction WITH entries count
      const fullTx = await tx.transaction.findUnique({
  where: { id: t.id },
  include: { entries: true },
});
return fullTx;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

ledgerRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { from, to, account, type, page = '1', limit = '20' } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { tenantId: (req.user as any).tenantId };

    if (from && to) {
      where.occurredAt = { gte: new Date(from), lte: new Date(to) };
    }

    if (account) {
      where.entries = { some: { account: { code: account } } };
    }

    if (type === 'debit') {
      where.entries = { some: { debit: { gt: 0 } } };
    } else if (type === 'credit') {
      where.entries = { some: { credit: { gt: 0 } } };
    }

    const [items, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { occurredAt: 'desc' },
        include: { entries: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- LEDGER STATS ----------
ledgerRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;

    const [creditAgg, debitAgg] = await Promise.all([
      prisma.entry.aggregate({
        _sum: { credit: true },
        where: { tenantId },
      }),
      prisma.entry.aggregate({
        _sum: { debit: true },
        where: { tenantId },
      }),
    ]);

    res.json({
      credits: Number(creditAgg._sum.credit ?? 0),
      debits: Number(debitAgg._sum.debit ?? 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- EXPORT ----------
ledgerRouter.get(
  '/export',
 
 
  async (req: Request, res: Response) => {
    try {
      const filters: LedgerFilterDto = req.query as any;
      const { account, currency, q, dateFrom, dateTo, format = 'csv' } = filters;

      const where: any = {
        tenantId: (req.user as any).tenantId,
        occurredAt:
          dateFrom || dateTo
            ? {
                gte: dateFrom ? new Date(dateFrom) : undefined,
                lte: dateTo ? new Date(dateTo) : undefined,
              }
            : undefined,
      };

      const items = await prisma.entry.findMany({
        where: {
          tenantId: (req.user as any).tenantId,
          currency: currency || undefined,
          transaction: {
            tenantId: (req.user as any).tenantId,
            occurredAt: where.occurredAt,
            description: q ? { contains: q, mode: 'insensitive' } : undefined,
          },
          account: account ? { code: account } : undefined,
        },
        include: { transaction: true, account: true },
        orderBy: { createdAt: 'desc' },
      });

      const buffer = await exporter.generate(items, format as any);

      const userId = (req.user as any).id || (req.user as any).userId || 'system';

      await auditService.logAction({
        tenantId: (req.user as any).tenantId,
        userId,
        action: 'ADMIN_EXPORT_LEDGER',
        details: { filters, count: items.length, format },
        ip: req.ip,
      });

     res.setHeader(
  "Content-Disposition",
  `attachment; filename=ledger-${Date.now()}.${format}`
);

if (format === "csv") {
  res.setHeader("Content-Type", "text/csv");
} else if (format === "xlsx") {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
} else if (format === "pdf") {
  res.setHeader("Content-Type", "application/pdf");
} else {
  res.setHeader("Content-Type", "application/octet-stream");
}
res.end(buffer); // ✅ send with proper headers
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
