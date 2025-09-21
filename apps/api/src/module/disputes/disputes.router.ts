
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { DisputesService } from './disputes.service';
import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

export const disputesRouter = Router();

// --- Services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
// ✅ pass the real audit service instead of `{}` to notifications
const notificationsService = new NotificationsService(prisma, auditService);
const ledgerService: LedgerService = new LedgerService(prisma, auditService, notificationsService);
const blockchainService = new BlockchainService(prisma, auditService);
const disputesService = new DisputesService(
  prisma,
  ledgerService,
  blockchainService,
  auditService,
  notificationsService,
);

// --- Middleware ---
disputesRouter.use(JwtGuard);
// ❌ DO NOT use global RolesGuard here (it runs before Roles(...) sets requirements)
// disputesRouter.use(RolesGuard);

// ----------------- FILE DISPUTE -----------------
disputesRouter.post(
  '/',
  Roles('CUSTOMER', 'MANAGER', 'ADMIN'),
  RolesGuard, // ✅ attach guard AFTER Roles(...)
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const dispute = await disputesService.file(user.tenantId, req.body);
      res.json(dispute);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- RESOLVE DISPUTE -----------------
disputesRouter.post(
  '/:id/resolve',
  Roles('OWNER', 'ADMIN'),
  RolesGuard, // ✅ attach guard AFTER Roles(...)
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const resolved = await disputesService.resolve(user.tenantId, id, req.body, user.id);
      res.json(resolved);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- GET DISPUTE -----------------
// If you want this restricted, add Roles(...) + RolesGuard here too.
// For now, let any authenticated user fetch (common pattern for customer + staff).
disputesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const dispute = await disputesService.get(user.tenantId, id);
    res.json(dispute);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

export default disputesRouter;