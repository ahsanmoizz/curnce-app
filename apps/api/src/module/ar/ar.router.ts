// apps/api/src/module/ar/ar.router.ts
import { Router, Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccountsReceivableService } from './ar.service';
import { AccountingService } from '../accounting/accounting.service'; // <-- FIXED path
import { JwtGuard } from '../../middleware/jwt.guard';
import { AuditService } from '../audit/audit.service';
export const arRouter = Router();
const logger = new Logger('ARRouter');

// --- Initialize services ---
const prisma = new PrismaService();
const accountingService = new AccountingService(prisma); // correct implementation expected by AR service
const auditService = new AuditService(prisma);
const arService = new AccountsReceivableService(
  prisma,
  accountingService,
  auditService
);

// --- Middleware ---
arRouter.use(JwtGuard);

// ----------------- CREATE CUSTOMER -----------------
arRouter.post('/customers', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const body = req.body;
    if (!body?.name) return res.status(400).json({ message: 'name required' });

    const customer = await arService.createCustomer(user.tenantId, body, req.ip, user.id);
    res.json(customer);
  } catch (err: any) {
    logger.error('POST /customers error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- CREATE INVOICE -----------------
arRouter.post('/invoices', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const body = req.body;
    if (!body?.customerId || !body?.invoiceNo || !body?.amount || !body?.dueDate) {
      return res.status(400).json({ message: 'customerId, invoiceNo, amount, dueDate required' });
    }

    const invoice = await arService.createInvoice(user.tenantId, body, req.ip, user.id);
    res.json(invoice);
  } catch (err: any) {
    logger.error('POST /invoices error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});

// ----------------- RECORD PAYMENT -----------------
arRouter.post('/payments', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const body = req.body;
    if (!body?.invoiceId || !body?.amount || !body?.paidDate || !body?.method) {
      return res.status(400).json({ message: 'invoiceId, amount, paidDate, method required' });
    }

    const payment = await arService.recordPayment(user.tenantId, body, req.ip, user.id);
    res.json(payment);
  } catch (err: any) {
    logger.error('POST /payments error', err);
    res.status(err?.status || 500).json({ message: err?.message || 'Internal server error' });
  }
});
// ----------------- GET CUSTOMERS -----------------
arRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const customers = await prisma.customer.findMany({
      where: { tenantId: user.tenantId },
    });
    res.json(customers);
  } catch (err: any) {
    logger.error('GET /customers error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----------------- GET INVOICES -----------------
arRouter.get('/invoices', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const invoices = await prisma.invoice.findMany({
      where: { tenantId: user.tenantId },
      include: { customer: true, payments: true },
    });
    res.json(invoices);
  } catch (err: any) {
    logger.error('GET /invoices error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----------------- GET PAYMENTS -----------------
arRouter.get('/payments', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.tenantId) return res.status(401).json({ message: 'unauthenticated' });

    const payments = await prisma.invoicePayment.findMany({
      where: { tenantId: user.tenantId },
      include: { invoice: true },
    });
    res.json(payments);
  } catch (err: any) {
    logger.error('GET /payments error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});