import { Router } from 'express';
import { PrismaService } from '../../prisma.service';
import { JwtGuard } from '../../middleware/jwt.guard';

const alertsRouter = Router();
const prisma = new PrismaService();
alertsRouter.get('/alerts', JwtGuard, async (req, res, next) => {
  try {
    const { level } = req.query;

    const alerts = await prisma.alert.findMany({
      where: {
        tenantId: req.user!.tenantId,
        level: typeof level === "string" ? level : undefined, // 👈 cast properly
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

export { alertsRouter };
