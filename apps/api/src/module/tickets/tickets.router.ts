// src/module/tickets/tickets.router.ts
import { Router, Response } from 'express';
import { TicketsService } from './tickets.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { PrismaService } from '../../prisma.service';

export default function createTicketsRouter() {
  const router = Router();
  const prisma = new PrismaService();
  const svc = new TicketsService(prisma);

  router.use(jwtMiddleware);

  // ---- CUSTOMER + ADMIN ----
  // POST /v1/tickets (any authenticated user can create)
  router.post('/', async (req: any, res: Response) => {
    const ticket = await svc.create(req.user.tenantId, {
      ...req.body,
      customerId: req.user.id, // ensure customerId is bound to logged-in user
    });
    res.json(ticket);
  });

  // POST /v1/tickets/:id/reply (customers or staff can reply)
  router.post('/:id/reply', async (req: any, res: Response) => {
    const sender: 'customer' | 'support' =
      ['OWNER', 'ADMIN', 'STAFF'].includes(req.user.role) ? 'support' : 'customer';
    const reply = await svc.reply(
      req.user.tenantId,
      req.params.id,
      sender,
      req.body.message,
    );
    res.json(reply);
  });

  // GET /v1/tickets/:id (customers can view their own ticket, staff can view any)
  router.get('/:id', async (req: any, res: Response) => {
    const ticket = await svc.get(req.user.tenantId, req.params.id);

    // if not staff, restrict access to own tickets
    if (!['OWNER', 'ADMIN', 'STAFF'].includes(req.user.role) &&
        ticket.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(ticket);
  });

  // ---- ADMIN ONLY ----
  // GET /v1/tickets (list all tickets)
  router.get(
    '/',
    rolesMiddleware(['OWNER', 'ADMIN', 'STAFF']),
    async (req: any, res: Response) => {
      const tickets = await prisma.ticket.findMany({
        where: { tenantId: req.user.tenantId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      res.json(tickets);
    },
  );

  return router;
}
