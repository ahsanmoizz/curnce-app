// apps/api/src/module/blockchain/blockchain.router.ts
import { Router, Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BlockchainService } from './blockchain.service';
import { AuditService } from '../audit/audit.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { PolygonAdapter } from '@ufa/blockchain';

export const blockchainRouter = Router();
const logger = new Logger('BlockchainRouter');

// --- Initialize services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const blockchainService = new BlockchainService(prisma, auditService);

// --- Middleware: require JWT (assumes JwtGuard sets req.user) ---
blockchainRouter.use(JwtGuard);

// ----------------- REGISTER WALLET -----------------
blockchainRouter.post('/wallets', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) {
      return res.status(401).json({ message: 'unauthenticated' });
    }

    const body = req.body as {
      label?: string;
      chain?: string;
      address?: string;
      currency?: string;
    };

    if (!body.label || !body.chain || !body.address) {
      return res.status(400).json({ message: 'label, chain, address required' });
    }

    if (!body.currency) {
      return res.status(400).json({ message: 'currency required' });
    }

    // ✅ only use relation, no tenantId scalar
    const createData: any = {
      label: body.label,
      chain: body.chain,
      address: body.address,
      currency: body.currency,
      tenant: { connect: { id: user.tenantId } },
    };

    const wallet = await prisma.wallet.create({ data: createData });
    return res.json(wallet);
  } catch (err: any) {
    logger.error('POST /wallets error', err);
    return res
      .status(err?.status || 500)
      .json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- LIST WALLETS -----------------
blockchainRouter.get('/wallets', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const items = await prisma.wallet.findMany({ where: { tenantId: user.tenantId } });
    return res.json(items);
  } catch (err: any) {
    logger.error('GET /wallets error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- TRANSFER (draft) -----------------
blockchainRouter.post('/transfers', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    // Day-1 behavior: return a draft tx hash (same as your controller)
    const txHash = '0xDRAFT_' + Math.random().toString(16).slice(2);
    return res.json({ txHash });
  } catch (err: any) {
    logger.error('POST /transfers error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- WALLET BALANCE (PolygonAdapter) -----------------
blockchainRouter.post('/wallets/balance', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const body = req.body as { address?: string };
    if (!body?.address) return res.status(400).json({ message: 'address required' });

    const rpc = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
    const adapter = new PolygonAdapter(rpc);
    const bal = await adapter.getBalance(body.address, 'ETH');

    return res.json({ balance: bal });
  } catch (err: any) {
    logger.error('POST /wallets/balance error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
// ----------------- SEND FUNDS -----------------
blockchainRouter.post('/send-funds', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const { from, to, amount, token, meta } = req.body;
    const result = await blockchainService.sendFunds(from, to, amount, token, { ...meta, tenantId: user.tenantId });
    return res.json(result);
  } catch (err: any) {
    logger.error('POST /send-funds error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- TX STATUS -----------------
blockchainRouter.get('/tx/:hash/status', async (req: Request, res: Response) => {
  try {
    const status = await blockchainService.getTxStatus(req.params.hash);
    return res.json({ status });
  } catch (err: any) {
    logger.error('GET /tx/:hash/status error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- TIMESTAMP DOCUMENT -----------------
blockchainRouter.post('/timestamp', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const { hash } = req.body;
    if (!hash) return res.status(400).json({ message: 'hash required' });

    const result = await blockchainService.timestampDocument(hash);
    return res.json(result);
  } catch (err: any) {
    logger.error('POST /timestamp error', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
