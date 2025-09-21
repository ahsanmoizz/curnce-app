// apps/api/src/module/reporting/reporting.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportsService } from './reports.service';  // <-- unified service
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { ForbiddenException, BadRequestException } from './exceptions';

export const reportingRouter = Router();

// --- Middleware ---
reportingRouter.use(JwtGuard);
reportingRouter.use(RolesGuard);

// --- Rate limiting setup ---
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateBucket = new Map<string, number[]>();

function rateLimitCheck(tenantId: string) {
  const now = Date.now();
  const existing = rateBucket.get(tenantId) || [];
  const pruned = existing.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (pruned.length >= RATE_LIMIT_MAX) {
    throw new BadRequestException('Rate limit exceeded. Try again shortly.');
  }
  pruned.push(now);
  rateBucket.set(tenantId, pruned);
}

// --- Initialize services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const reportsService = new ReportsService(prisma, auditService);

// --- Tenant Resolver ---
function resolveTenantId(req: any, override?: string) {
  const role = (req.user?.role || req.user?.roles || '').toString().toUpperCase();
  const isAdmin = role.includes('ADMIN') || role.includes('OWNER');
  if (override && override !== 'me') {
    if (!isAdmin) throw new ForbiddenException('Not allowed to access other tenants');
    return override;
  }
  return req.user.tenantId;
}

// ----------------- Trial Balance -----------------
reportingRouter.get('/trial-balance', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req as any).user.tenantId;
    const { start, end } = req.query;

    if (!tenantId) return res.status(400).json({ message: 'tenantId required' });
    if (!start || !end) return res.status(400).json({ message: 'start and end required (ISO date strings)' });

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }

    const data = await reportsService.getTrialBalance(tenantId, startDate, endDate);
    res.json(data);
  } catch (err: any) {
    console.error('trial-balance error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Close Period -----------------
reportingRouter.post('/close-period', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.body?.tenantId as string) || (req as any).user.tenantId;
    const { period, startDate, endDate } = req.body || {};

    if (!tenantId) return res.status(400).json({ message: 'tenantId required' });
    if (!period || !startDate || !endDate) {
      return res.status(400).json({ message: 'period, startDate, endDate required' });
    }

    const dto = { period, startDate: new Date(startDate), endDate: new Date(endDate) };
    if (isNaN(dto.startDate.getTime()) || isNaN(dto.endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate or endDate' });
    }

    const result = await reportsService.closePeriod(tenantId, dto);
    res.json(result);
  } catch (err: any) {
    console.error('close-period error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Balance Sheet -----------------
reportingRouter.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { asOf } = req.query;
    const tenantId = (req as any).user.tenantId;
    const report = await reportsService.balanceSheet(tenantId, new Date(asOf as string));
    res.json(report);
  } catch (err: any) {
    console.error('balance-sheet error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Income Statement -----------------
reportingRouter.get('/income-statement', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const tenantId = (req as any).user.tenantId;
    const report = await reportsService.incomeStatement(
      tenantId,
      new Date(start as string),
      new Date(end as string),
    );
    res.json(report);
  } catch (err: any) {
    console.error('income-statement error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Cash Flow -----------------
reportingRouter.get('/cash-flow', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const tenantId = (req as any).user.tenantId;
    const report = await reportsService.cashFlow(
      tenantId,
      new Date(start as string),
      new Date(end as string),
    );
    res.json(report);
  } catch (err: any) {
    console.error('cash-flow error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Budget Variance -----------------
reportingRouter.get('/budget-variance', async (req: Request, res: Response) => {
  try {
    const { year, period } = req.query;
    const tenantId = (req as any).user.tenantId;
    const report = await reportsService.budgetVariance(
      tenantId,
      parseInt(year as string, 10),
      period as string,
    );
    res.json(report);
  } catch (err: any) {
    console.error('budget-variance error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- Export Reports (Ledger / Payments / Compliance) -----------------
async function handleReport(req: Request, res: Response, type: 'ledger' | 'payments' | 'compliance') {
  try {
    const format = (req.query.format as string || 'csv') as 'csv' | 'xlsx' | 'pdf' | 'json';
    const tenantId = resolveTenantId(req, req.query.tenantId as string);

    if (!['csv', 'xlsx', 'pdf', 'json'].includes(format)) {
      throw new BadRequestException('Invalid format');
    }
    rateLimitCheck(tenantId);

    let result;
    if (type === 'ledger') result = await reportsService.generateLedgerReport(tenantId, format);
    if (type === 'payments') result = await reportsService.generatePaymentsReport(tenantId, format);
    if (type === 'compliance') result = await reportsService.generateComplianceNotificationsReport(tenantId, format);

    await auditService.logAction({
      tenantId,
      userId: req.user!.id || req.user!.userId || 'system',
      action: 'REPORT_GENERATED',
      details: { type, format },
    });

    if (format === 'json') return res.json(result);
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err: any) {
    console.error(`${type}-report error`, err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
}

reportingRouter.get('/ledger-report', (req, res) => handleReport(req, res, 'ledger'));
reportingRouter.get('/payments-report', (req, res) => handleReport(req, res, 'payments'));
reportingRouter.get('/compliance-report', (req, res) => handleReport(req, res, 'compliance'));
