// apps/api/src/module/exports/exports.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { ExportService } from './exports.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';
import { PaymentFilterDto, LedgerFilterDto, LegalQueryFilterDto, AuditFilterDto } from './dto';

export const exportsRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const exporter = new ExportService();

// --- Middleware ---
// --- Middleware ---
exportsRouter.use(JwtGuard);
exportsRouter.use(RolesGuard);
// ----------------- EXPORT PAYMENTS -----------------
exportsRouter.get('/payments', Roles('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const filters: PaymentFilterDto = req.query as any;

    const { status, tenantId, q, dateFrom, dateTo, format = 'csv' } = filters;

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

    // 🔥 Pagination handling
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 100);
    const skip = (page - 1) * limit;

    const items = await prisma.paymentIntent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const buffer = await exporter.generate(items, format as any);

    res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.${format}`);
    res.end(buffer);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});


// ----------------- EXPORT LEDGER -----------------
exportsRouter.get('/ledger', Roles('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const filters: LedgerFilterDto = req.query as any;

    const { account, currency, q, dateFrom, dateTo, format = 'csv' } = filters;

    const where: any = {
      tenantId: user.tenantId,
      currency: currency || undefined,
      createdAt: (dateFrom || dateTo) ? {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
    if (q) {
      where.OR = [
        { type: { contains: q, mode: 'insensitive' } },
        { referenceId: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 🔥 Pagination handling
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 100);
    const skip = (page - 1) * limit;

    const items = await prisma.ledgerRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const buffer = await exporter.generate(items, format as any);

    res.setHeader('Content-Disposition', `attachment; filename=ledger-${Date.now()}.${format}`);
    res.end(buffer);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
// ----------------- EXPORT AUDIT LOGS -----------------
exportsRouter.get('/audit', Roles('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const filters: AuditFilterDto = req.query as any;
    const { type, q, dateFrom, dateTo, format = 'csv' } = filters;

    const where: any = {
      tenantId: user.tenantId,
      createdAt: (dateFrom || dateTo) ? {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
    if (type) where.action = type;
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 🔥 Pagination handling
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 100);
    const skip = (page - 1) * limit;

    const items = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const buffer = await exporter.generate(items, format as any);

    res.setHeader('Content-Disposition', `attachment; filename=audit-${Date.now()}.${format}`);
    res.end(buffer);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
