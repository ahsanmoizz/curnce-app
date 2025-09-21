// src/module/treasury/treasury.router.ts
/*import { Router, Request, Response } from 'express';
import { TreasuryService } from './treasury.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
export default function createTreasuryRouter() {
  const router = Router();
  const prisma = new PrismaService();
const audit = new AuditService(prisma); 
const notifications = new NotificationsService(prisma,audit); 
  const svc = new TreasuryService(prisma, audit, notifications);

  // Guards
  router.use(jwtMiddleware, rolesMiddleware);

  // ---- Bank Accounts ----
  router.post('/bank-accounts', async (req: any, res) => {
    const result = await svc.createBankAccount(req.user.tenantId, req.body);
    res.json(result);
  });

  router.get('/bank-accounts', async (req: any, res) => {
    const result = await svc.listBankAccounts(req.user.tenantId);
    res.json(result);
  });

  // ---- Forecast ----
  router.post('/forecast', async (req: any, res) => {
    const { horizon, startDate, endDate } = req.body;
    const result = await svc.generateForecast(req.user.tenantId, horizon, new Date(startDate), new Date(endDate));
    res.json(result);
  });

  // ---- Payment Runs ----
  router.post('/payment-runs', async (req: any, res) => {
    const result = await svc.createPaymentRun(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/payment-runs/:id/approve', async (req: any, res) => {
    const result = await svc.approvePaymentRun(req.user.tenantId, req.params.id, req.user?.userId ?? req.user?.id);
    res.json(result);
  });

  router.post('/payment-runs/:id/execute', async (req: any, res) => {
    const result = await svc.executePaymentRun(req.user.tenantId, req.params.id, req.user?.userId ?? req.user?.id);
    res.json(result);
  });

  // ---- Collections ----
  router.post('/collections/plan', async (req: any, res) => {
    const result = await svc.planCollection(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/collections/:id/receive', async (req: any, res) => {
    const result = await svc.markCollectionReceived(req.user.tenantId, req.params.id, new Date(req.body.receivedOn));
    res.json(result);
  });

  // ---- Bank Statements ----
  router.post('/bank/import', async (req: any, res) => {
    const result = await svc.importBankStatement(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/bank/:statementId/reconcile/auto', async (req: any, res) => {
    const result = await svc.autoReconcile(req.user.tenantId, req.params.statementId);
    res.json(result);
  });

  return router;
}
*/
// src/module/treasury/treasury.router.ts
import { Router, Request, Response } from 'express';
import { TreasuryService } from './treasury.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';



export default function createTreasuryRouter() {
  const router = Router();
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const notifications = new NotificationsService(prisma,audit); 
  const svc = new TreasuryService(prisma, audit, notifications);

  // Guards
  
  router.use(jwtMiddleware, rolesMiddleware(['OWNER', 'ADMIN']));

  // ---- Bank Accounts ----
  router.post('/bank-accounts', async (req: any, res) => {
    const result = await svc.createBankAccount(req.user.tenantId, req.body);
    res.json(result);
  });

  router.get('/bank-accounts', async (req: any, res) => {
    const result = await svc.listBankAccounts(req.user.tenantId);
    res.json(result);
  });

  // ---- Forecast ----
  router.post('/forecast', async (req: any, res) => {
    const { horizon, startDate, endDate } = req.body;
    const result = await svc.generateForecast(req.user.tenantId, horizon, new Date(startDate), new Date(endDate));
    res.json(result);
  });

  // ---- Payment Runs ----
  router.post('/payment-runs', async (req: any, res) => {
    const result = await svc.createPaymentRun(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/payment-runs/:id/approve', async (req: any, res) => {
    const result = await svc.approvePaymentRun(req.user.tenantId, req.params.id, req.user?.userId ?? req.user?.id);
    res.json(result);
  });

  router.post('/payment-runs/:id/execute', async (req: any, res) => {
    const result = await svc.executePaymentRun(req.user.tenantId, req.params.id, req.user?.userId ?? req.user?.id);
    res.json(result);
  });

  // ---- Collections ----
  router.post('/collections/plan', async (req: any, res) => {
    const result = await svc.planCollection(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/collections/:id/receive', async (req: any, res) => {
    const result = await svc.markCollectionReceived(req.user.tenantId, req.params.id, new Date(req.body.receivedOn));
    res.json(result);
  });

  // ---- Bank Statements ----
  router.post('/bank/import', async (req: any, res) => {
    const result = await svc.importBankStatement(req.user.tenantId, req.body);
    res.json(result);
  });

  router.post('/bank/:statementId/reconcile/auto', async (req: any, res) => {
    const result = await svc.autoReconcile(req.user.tenantId, req.params.statementId);
    res.json(result);
  });
    router.get('/forecasts', async (req: any, res) => {
    try {
      const result = await svc.listForecasts(req.user.tenantId);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  });

  // ---- Payment Runs ----
  router.get('/payment-runs', async (req: any, res) => {
    try {
      const result = await svc.listPaymentRuns(req.user.tenantId);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  });

  router.get('/payment-runs/:id', async (req: any, res) => {
    try {
      const result = await svc.getPaymentRun(req.user.tenantId, req.params.id);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  });

  // ---- Collections ----
  router.get('/collections', async (req: any, res) => {
    try {
      const result = await svc.listCollections(req.user.tenantId);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  });

  // ---- Bank Statements ----
  router.get('/bank/statements', async (req: any, res) => {
    try {
      const result = await svc.listBankStatements(req.user.tenantId);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  });

  return router;
}
