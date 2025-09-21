// apps/api/src/module/accounting-reports/accounting-reports.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { AccountingReportsService } from './accounting-reports.service';
import { JwtGuard } from '../../middleware/jwt.guard';

export const accountingReportsRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const reportsService = new AccountingReportsService(prisma);

// --- Middleware (protect all endpoints) ---
accountingReportsRouter.use(JwtGuard);

// ----------------- GET TRIAL BALANCE -----------------
// GET /trial-balance?start=YYYY-MM-DD&end=YYYY-MM-DD[&tenantId=...]
accountingReportsRouter.get('/trial-balance', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const tenantId = (req.query.tenantId as string) || user.tenantId;
    const startStr = req.query.start as string;
    const endStr = req.query.end as string;

    if (!tenantId) return res.status(400).json({ message: 'tenantId required (either query or authenticated user)' });
    if (!startStr || !endStr) return res.status(400).json({ message: 'start and end query params required (ISO date strings)' });

    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'start or end is not a valid date' });
    }

    const data = await reportsService.getTrialBalance(String(tenantId), start, end);
    res.json(data);
  } catch (err: any) {
    console.error('trial-balance error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- POST CLOSE PERIOD -----------------
// POST /close-period
// body: { period: string, startDate: ISOstring, endDate: ISOstring, tenantId?: string }
accountingReportsRouter.post('/close-period', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const tenantId = (req.body?.tenantId as string) || user.tenantId;
    const { period, startDate, endDate } = req.body || {};

    if (!tenantId) return res.status(400).json({ message: 'tenantId required (either body or authenticated user)' });
    if (!period || !startDate || !endDate) {
      return res.status(400).json({ message: 'period, startDate, endDate required in body' });
    }

    const dto = {
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    if (isNaN(dto.startDate.getTime()) || isNaN(dto.endDate.getTime())) {
      return res.status(400).json({ message: 'startDate or endDate is not a valid date' });
    }

    const result = await reportsService.closePeriod(String(tenantId), dto);
    res.json(result);
  } catch (err: any) {
    console.error('close-period error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
