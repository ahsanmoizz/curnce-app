import { Router, Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccountsPayableService } from './ap.service';
import { AccountingService } from '../accounting/accounting.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { AuditService } from '../audit/audit.service';

export const apRouter = Router();
const logger = new Logger('APRouter');

// --- Initialize services ---
const prisma = new PrismaService();
const accountingService = new AccountingService(prisma);
const auditService = new AuditService(prisma);
const apService = new AccountsPayableService(prisma, accountingService, auditService);

// --- Middleware ---
apRouter.use(JwtGuard);

// ----------------- CREATE VENDOR -----------------
apRouter.post('/vendors', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    if (!req.body?.name) return res.status(400).json({ message: 'Vendor name required' });

    const vendor = await apService.createVendor(user.tenantId, req.body, req.ip, user.id);
    res.json(vendor);
  } catch (err: any) {
    logger.error('POST /vendors error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- CREATE BILL -----------------
apRouter.post('/bills', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const { vendorId, invoiceNo, amount, dueDate } = req.body;
    if (!vendorId || !invoiceNo || !amount || !dueDate) {
      return res.status(400).json({ message: 'vendorId, invoiceNo, amount, dueDate required' });
    }

    const bill = await apService.createBill(user.tenantId, req.body, req.ip, user.id);
    res.json(bill);
  } catch (err: any) {
    logger.error('POST /bills error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- RECORD BILL PAYMENT -----------------
apRouter.post('/bills/:billId/payments', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const { amount, paidDate, method } = req.body;
    if (!amount || !paidDate || !method) {
      return res.status(400).json({ message: 'amount, paidDate, method required' });
    }

    const payment = await apService.recordPayment(
      user.tenantId,
      { ...req.body, billId: req.params.billId },
      req.ip,
      user.id
    );
    res.json(payment);
  } catch (err: any) {
    logger.error('POST /bills/:billId/payments error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- GET VENDORS -----------------
apRouter.get('/vendors', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const vendors = await prisma.vendor.findMany({
      where: { tenantId: user.tenantId },
    });
    res.json(vendors);
  } catch (err: any) {
    logger.error('GET /vendors error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----------------- GET BILLS -----------------
apRouter.get('/bills', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const bills = await prisma.bill.findMany({
      where: { tenantId: user.tenantId },
      include: { vendor: true, payments: true },
    });
    res.json(bills);
  } catch (err: any) {
    logger.error('GET /bills error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----------------- GET BILL PAYMENTS -----------------
apRouter.get('/payments', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const payments = await prisma.billPayment.findMany({
      where: { tenantId: user.tenantId },
      include: { bill: true },
    });
    res.json(payments);
  } catch (err: any) {
    logger.error('GET /payments error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
apRouter.post('/payments', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const { billId, amount, paidDate, method } = req.body;
    if (!billId || !amount || !paidDate || !method) {
      return res.status(400).json({ message: 'billId, amount, paidDate, method required' });
    }

    const payment = await apService.recordPayment(
      user.tenantId,
      { billId, amount, paidDate, method },
      req.ip,
      user.id
    );

    res.json(payment);
  } catch (err: any) {
    logger.error('POST /payments error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
