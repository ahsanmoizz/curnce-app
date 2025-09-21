// apps/api/src/module/refunds/refunds.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { RefundsService } from './refunds.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export const refundsRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();

// First create audit + notifications (they don’t depend on ledger)
const audit = new AuditService(prisma);
const notifications = new NotificationsService(prisma, audit);


// Now ledger can safely use audit + notifications
const ledger = new LedgerService(prisma, audit, notifications);

// Blockchain depends on audit
const blockchain = new BlockchainService(prisma, audit);

// Finally refunds service
const refundsService = new RefundsService(
  prisma,
  ledger,
  blockchain,
  audit,
  notifications
);

// --- Middleware ---
refundsRouter.use(JwtGuard);

// ----------------- REQUEST REFUND -----------------
refundsRouter.post(
  '/request',
  Roles('CUSTOMER'),
RolesGuard,

  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = req.body;

      const refund = await refundsService.requestRefund(tenantId, body, userId);
      res.json(refund);
    } catch (err: any) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- APPROVE REFUND (POST) -----------------
refundsRouter.post(
  '/approve',
  Roles('ADMIN', 'OWNER'),
  Roles('CUSTOMER'),
RolesGuard,

  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const refundId = req.body.refundId;

      const approved = await refundsService.approveRefund(
        tenantId,
        refundId,
        userId
      );
      res.json(approved);
    } catch (err: any) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- GET REFUND -----------------
refundsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const refund = await refundsService.getRefund(tenantId, id);
    res.json(refund);
  } catch (err: any) {
    console.error(err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- APPROVE REFUND (PATCH) -----------------
refundsRouter.patch(
  '/:id/approve',
  Roles('ADMIN', 'OWNER'),
  Roles('CUSTOMER'),
RolesGuard,

  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { id } = req.params;

      const approved = await refundsService.approveRefund(
        tenantId,
        id,
        userId
      );
      res.json(approved);
    } catch (err: any) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- RELEASE REFUND -----------------
refundsRouter.patch(
  '/:id/release',
  Roles('ADMIN'),
  Roles('CUSTOMER'),
RolesGuard,

  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { id } = req.params;

      const released = await refundsService.releaseRefund(
        tenantId,
        id,
        userId
      );
      res.json(released);
    } catch (err: any) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal server error' });
    }
  }
);
refundsRouter.post('/seed', async (req: Request, res: Response) => {
  try {
    // fallback tenant + user for seed
    const tenantId = req.user?.tenantId || 'test_tenant';
    const customerId = req.body.customerId || 'cust_seed';
    const txId = req.body.originalTransactionId || 'tx_seed';

    const refund = await prisma.refund.create({
      data: {
        tenantId,
        customerId,
        originalTransactionId: txId,
        amount: req.body.amount || 100,
        currency: req.body.currency || 'USD',
        reason: req.body.reason || 'seed refund',
        destination: 'original',
        status: 'requested',
        createdAt: new Date(),
      },
    });

    res.json({ ok: true, seed: refund });
  } catch (err: any) {
    console.error('[Refunds:seed]', err);
    res.status(500).json({ message: err.message || 'Refunds seed failed' });
  }
});
// ----------------- LIST REFUNDS -----------------
refundsRouter.get(
  '/',
  Roles('ADMIN', 'MANAGER'),
  Roles('CUSTOMER'),
RolesGuard,

  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const refunds = await refundsService.listRefunds(tenantId);
      res.json(refunds);
    } catch (err: any) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || 'Internal server error' });
    }
  }
);
