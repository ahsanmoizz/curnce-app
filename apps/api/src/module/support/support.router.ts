// apps/api/src/module/support/support.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { SupportService } from './support.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

export const supportRouter = Router();

// --- Initialize services (same dependency graph as Nest) ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const notificationsService = new NotificationsService(prisma, auditService);
const supportService = new SupportService(prisma, notificationsService, auditService);

// --- Middleware (global to this router) ---
supportRouter.use(JwtGuard);

// ----------------- CREATE TICKET -----------------
supportRouter.post('/ticket', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const dto = req.body as { subject: string; category?: string; priority?: string };

    const tenantId = user.tenantId;
    const role = (user.role || '').toString().toUpperCase();
    const userId = user.id || user.userId || 'system';
    const customerId = role === 'CUSTOMER' ? (user.id || user.userId) : null;

    const ticket = await supportService.createTicket(
      tenantId,
      customerId,
      dto.subject,
      dto.category || null,
      dto.priority || 'medium',
      userId,
    );

    res.json(ticket);
  } catch (err: any) {
    console.error('POST /ticket error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- ADD MESSAGE TO TICKET -----------------
supportRouter.post('/ticket/:id/message', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const dto = req.body as { content: string };

    const senderId = user.id || user.userId || 'system';
    const tenantId = user.tenantId;

    const msg = await supportService.addMessage(id, senderId, dto.content, tenantId);
    res.json(msg);
  } catch (err: any) {
    console.error(`POST /ticket/:id/message error`, err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- UPDATE TICKET STATUS (roles protected) -----------------
// Role check middleware applied inline: Roles(...) then RolesGuard
supportRouter.patch(
  '/ticket/:id/status',
  Roles('ADMIN', 'STAFF'),
  RolesGuard,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const dto = req.body as { status: string };

      const tenantId = user.tenantId;
      const userId = user.id || user.userId || 'system';

      const updated = await supportService.updateStatus(id, dto.status, userId, tenantId);
      res.json(updated);
    } catch (err: any) {
      console.error(`PATCH /ticket/:id/status error`, err);
      res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
    }
  },
);

// ----------------- LIST TICKETS -----------------
supportRouter.get('/tickets', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const status = (req.query.status as string) || undefined;
    const items = await supportService.listTickets(user.tenantId, status);
    res.json(items);
  } catch (err: any) {
    console.error('GET /tickets error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- GET SINGLE TICKET -----------------
supportRouter.get('/ticket/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const ticket = await supportService.getTicket(id, user.tenantId);
    res.json(ticket);
  } catch (err: any) {
    console.error('GET /ticket/:id error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
