// apps/api/src/module/dashboard/dashboard.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../../middleware/jwt.guard';

export const dashboardRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const dashboardService = new DashboardService(prisma);

// --- Middleware ---
dashboardRouter.use(JwtGuard);

// ----------------- DASHBOARD OVERVIEW -----------------
dashboardRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const overview = await dashboardService.getOverview(user.tenantId);
    res.json(overview);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
