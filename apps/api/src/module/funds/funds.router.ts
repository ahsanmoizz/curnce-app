// apps/api/src/module/funds/funds.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { FundsService } from './funds.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

export const fundsRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const ledgerService = new LedgerService(prisma, auditService, {} as any); // notifications placeholder
const blockchainService = new BlockchainService(prisma, auditService);
const fundsService = new FundsService(prisma, ledgerService, blockchainService, auditService);

// --- Middleware ---
fundsRouter.use(JwtGuard);
fundsRouter.use(RolesGuard);

fundsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
   const transfers = await prisma.fundTransfer.findMany({
  where: { tenantId: user.tenantId },
  orderBy: { createdAt: 'desc' }
});
    res.json(transfers);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- TRANSFER FUNDS -----------------
fundsRouter.post(
  '/transfer',
  Roles('OWNER', 'ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { fromWalletId, toWalletId, amount, currency } = req.body;

      const result = await fundsService.transferFunds(
        user.tenantId,
        fromWalletId,
        toWalletId,
        amount,
        currency,
        user
      );
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- GET TRANSFER STATUS -----------------
fundsRouter.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const status = await fundsService.getTransferStatus(user.tenantId, id);
    res.json(status);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
