// apps/api/src/module/notifications/notifications.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from './notifications.service';
import { AuditService } from '../audit/audit.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

export const notificationsRouter = Router();

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const notificationsService = new NotificationsService(prisma, auditService);

notificationsRouter.use(JwtGuard);

// ---------- IN-APP NOTIFICATIONS ----------
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const notifications = await notificationsService.list(tenantId, req.query);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const { id } = req.params;
    const result = await notificationsService.markRead(id, tenantId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const notification = await notificationsService.sendInApp(user.tenantId, null, {
      type: 'system',
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test notification',
    });

    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- CHANNELS ----------
notificationsRouter.get('/channels', Roles('OWNER', 'ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const channels = await prisma.notificationChannel.findMany({ where: { tenantId } });
    res.json(channels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.post('/channels', Roles('OWNER', 'ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const body = req.body;

    if (body.id) {
      const updated = await prisma.notificationChannel.update({ where: { id: body.id }, data: { ...body } });
      return res.json(updated);
    }

    const created = await prisma.notificationChannel.create({
      data: {
        tenantId,
        type: body.type,
        target: body.target,
        meta: body.meta || null,
        enabled: body.enabled ?? true,
      },
    });
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.delete('/channels/:id', Roles('OWNER', 'ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notificationChannel.update({ where: { id }, data: { enabled: false } });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- LOGS ----------
notificationsRouter.get('/logs', Roles('OWNER', 'ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const logs = await prisma.notificationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { channel: true },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.post('/retry', Roles('OWNER', 'ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const result = await notificationsService.retryFailed();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- STATS ----------
notificationsRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;
    const type = req.query.type as string | undefined;

    const where: any = { tenantId };
    if (type) where.type = type;

    const complianceCount = await prisma.notification.count({ where: { ...where, type: type ?? 'compliance' } });
    res.json({ complianceCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.user as any).tenantId;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM "Notification"
      WHERE "tenantId" = $1 AND "type" = 'compliance'
      GROUP BY 1
      ORDER BY 1 ASC
    `, tenantId);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
