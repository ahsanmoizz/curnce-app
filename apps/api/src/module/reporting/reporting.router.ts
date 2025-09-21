// apps/api/src/module/reporting/reporting.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportingService } from './reporting.service';
import { JwtGuard } from '../../middleware/jwt.guard';

export const reportingRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const reportingService = new ReportingService(prisma, auditService);

// --- Middleware ---
reportingRouter.use(JwtGuard);

// ---------- Generate Report ----------
reportingRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { type, period } = req.body;

    if (type === 'ComplianceAudit') {
      const report = await reportingService.generateComplianceReport(user.tenantId, period);
      return res.json(report);
    }

    const report = await reportingService.generateFinancialReport(user.tenantId, type, period);
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ---------- Get Report ----------
reportingRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const report = await reportingService.getReport(id, user.tenantId);
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ---------- Balance Sheet ----------
reportingRouter.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { asOf } = req.query;
    const report = await reportingService.balanceSheet(user.tenantId, new Date(asOf as string));
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ---------- Income Statement ----------
reportingRouter.get('/income-statement', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { start, end } = req.query;
    const report = await reportingService.incomeStatement(user.tenantId, new Date(start as string), new Date(end as string));
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ---------- Cash Flow ----------
reportingRouter.get('/cash-flow', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { start, end } = req.query;
    const report = await reportingService.cashFlow(user.tenantId, new Date(start as string), new Date(end as string));
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ---------- Budget Variance ----------
reportingRouter.get('/budget-variance', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { year, period } = req.query;
    const report = await reportingService.budgetVariance(user.tenantId, parseInt(year as string, 10), period as string);
    res.json(report);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
