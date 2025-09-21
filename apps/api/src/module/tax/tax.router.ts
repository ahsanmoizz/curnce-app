// apps/api/src/module/tax/tax.router.ts
import { Router, Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TaxService } from './tax.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { AuditService } from '../audit/audit.service'; 
import { AccountingService } from '../accounting/accounting.service';
export const taxRouter = Router();
const logger = new Logger('TaxRouter');

// --- Initialize services ---
const prisma = new PrismaService();
const audit = new AuditService(prisma);   // ✅ create instance
const accounting = new AccountingService(prisma);  // ✅ create accounting service
const taxService = new TaxService(prisma, audit, accounting);  // ✅ pass all 3 args


// --- Middleware ---
taxRouter.use(JwtGuard);

// ----------------- FILE TAX RETURN -----------------
taxRouter.post('/file', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) {
      return res.status(401).json({ message: 'unauthenticated' });
    }

   const dto = req.body as { type: string; period: string };
const result = await taxService.fileReturn(user.tenantId, dto, user.id); // ✅ pass user.id
return res.json(result);
  } catch (err: any) {
    logger.error('fileReturn failed', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- RECORD TAX PAYMENT -----------------
taxRouter.post('/pay', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) {
      return res.status(401).json({ message: 'unauthenticated' });
    }

    // coerce paidDate if provided as string
    const body = { ...(req.body as any) };
    if (body.paidDate) {
      body.paidDate = new Date(body.paidDate);
    }

    const dto = body as {
      taxReturnId: string;
      amount: number;
      paidDate: Date;
      reference?: string;
    };
 const result = await taxService.recordPayment(user.tenantId, dto, user.id);
    return res.json(result);
  } catch (err: any) {
    logger.error('recordPayment failed', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- LIST RETURNS -----------------
taxRouter.get('/returns', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.tenantId) {
      return res.status(401).json({ message: 'unauthenticated' });
    }

    const items = await taxService.listReturns(user.tenantId);
    return res.json(items);
  } catch (err: any) {
    logger.error('listReturns failed', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
