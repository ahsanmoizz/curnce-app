import cors from "cors";
import * as dotenv from 'dotenv';
import * as path from 'path';

// MUST come first for local env
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import express from 'express';
import bodyParser from 'body-parser';

// Routers
import { createAICashRouter } from "./module/ai-cash/aiCash.router";

import { createArchiveRouter } from './module/archieve/archieve.router';
import authRouter from './module/auth/auth.router';
import { accountsRouter } from './module/accounts/accounts.router';
import { alertsRouter } from './module/alerts/alerts.router';
import { aiRouter } from './module/ai/ai.router';
import { createClassifyRouter } from './module/classify/classify.router';
import { createAnalyticsRouter } from './module/analytics/analytics.router';
import createTenantsRouter from './module/tenants/tenants.router';
import createTicketsRouter from './module/tickets/tickets.router';
import createTreasuryRouter from './module/treasury/treasury.router';
import { auditRouter } from './module/audit/audit.router';
import { complianceRouter } from './module/compliance/compliance.router';
import { contractsRouter } from './module/contracts/contracts.router';
import { ledgerRouter } from './module/ledger/ledger.router';
import { notificationsRouter } from './module/notifications/notifications.router';
import { paymentsRouter } from './module/payments/payments.router';
import { dashboardRouter } from './module/dashboard/dashboard.router';
import { corpdocsRouter } from "./module/corpdocs/corpdocs.router";
import { customersRouter } from './module/customers/customers.router';
import { disputesRouter } from './module/disputes/disputes.router';
import { SubscriptionService } from "./module/subscription/subscription.service";
import { superadminRouter, tenantRouter } from "./module/subscription/subscription.router";
import { exportsRouter } from './module/exports/exports.router';
import { fundsRouter } from './module/funds/funds.router';
import { ingestionRouter } from './module/ingestion/ingestion.router';
import { payrollRouter } from './module/payroll/payroll.router';
import { refundsRouter } from './module/refunds/refunds.router';
import { rulesRouter } from './module/rules/rules.router';
import { reportingRouter } from './module/reports/reports.router';
import { supportRouter } from './module/support/support.router';
import { systemRouter } from './module/system/system.router';
import { taxRouter } from './module/tax/tax.router';
import { blockchainRouter } from './module/blockchain/blockchain.router';
import { arRouter } from './module/ar/ar.router';
import { apRouter } from './module/ap/ap.router';
import { PrismaService } from './prisma.service';
import { AuditService } from './module/audit/audit.service';
import { ExportService } from './module/exports/exports.service';
import { AiLegalService } from './module/ai-legal/ai-legal.service';
import { AccountingService } from './module/accounting/accounting.service';
import { buildAccountingRouter } from './module/accounting/accounting.router';
import { buildAiLegalRouter } from './module/ai-legal/ai-legal.router';

// ✅ Cron jobs./module/superadmin/subscription.router
import './module/compliance/compliance.cron';
import './module/notifications/notifications-retry.cron';
import './module/scheduler/scheduler.cron';
import './module/ar/ar.overdue.cron';
import './module/ap/ap.overdue.cron';
async function bootstrap() { 
  
const app = express();
const port = process.env.PORT || 3000;
 const prisma = new PrismaService();
  const subscriptionService = new SubscriptionService(prisma);
  app.use(cors({
  origin: [
    "https://curnce.com",        // client frontend
    "https://curnce.com/admin"   // admin frontend
  ],
  credentials: true,
}));

// ✅ Preflight handler
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin && (origin === "https://curnce.com" || origin === "https://curnce.com/admin")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

 app.use("/v1/subscription", superadminRouter); // no auth
app.use("/v1/subscription", tenantRouter);    // needs auth
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

  // ✅ Purane tenants ke liye system accounts ensure karo
 
  // ✅ Services (singletons)

//const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const exporter = new ExportService();
  const aiLegalService = new AiLegalService(prisma);
  const accounting = new AccountingService(prisma);
  // ✅ Routers (legacy ones first)
  app.use('/v1/auth', authRouter);
  app.use('/v1', accountsRouter);
  app.use('/v1', alertsRouter);
  app.use('/v1/ai', aiRouter);
  app.use('/v1/funds', fundsRouter);
  app.use('/v1/analytics', createAnalyticsRouter());
  app.use('/v1/classify', createClassifyRouter());
  console.log('createTenantsRouter is', createTenantsRouter);
app.use('/v1/tenants', createTenantsRouter());
 app.use('/v1/corpdocs', corpdocsRouter);
  app.use('/v1/tickets', createTicketsRouter());
  app.use('/v1/treasury', createTreasuryRouter());
  app.use('/v1', auditRouter);
  app.use('/v1', complianceRouter);
  app.use('/v1', contractsRouter);
  app.use('/v1/archive', createArchiveRouter());
app.use("/v1/ai-cash", createAICashRouter());
  app.use('/v1/ledger', ledgerRouter);
  app.use('/v1/notifications', notificationsRouter);
 app.use('/v1/payments', paymentsRouter);
app.use('/v1/dashboard', dashboardRouter);
app.use('/v1/customers', customersRouter);
  app.use('/v1/disputes', disputesRouter);
  app.use('/v1/exports', exportsRouter);
  app.use('/v1/ingestion', ingestionRouter);
  app.use('/v1/payroll', payrollRouter);
  app.use('/v1/refunds', refundsRouter);
  app.use('/v1/rules', rulesRouter);
  app.use('/v1/reporting', reportingRouter);
  app.use('/v1/support', supportRouter);
  app.use('/v1/system', systemRouter);
  app.use('/v1/tax', taxRouter);
  app.use('/v1', blockchainRouter);
  app.use('/v1/ar', arRouter);
  app.use('/v1/ap', apRouter);
  // ✅ New style routers (clean + service-based)
  app.use('/v1/accounting', buildAccountingRouter(accounting));
  app.use('/v1/legal', buildAiLegalRouter(aiLegalService, prisma, audit, exporter));

  // ✅ Root health
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'API running 🚀', timestamp: new Date().toISOString() });
  });

  // ✅ Log mounted routes
  const router = app._router;
  if (router?.stack) {
    console.log('>>> Registered Routes:');
    router.stack
      .filter((layer: any) => layer.route)
      .forEach((layer: any) => {
        const path = layer.route?.path;
        const methods = Object.keys(layer.route.methods)
          .map((m) => m.toUpperCase())
          .join(', ');
        console.log(`${methods} ${path}`);
      });
  }

  // ✅ Error handler
   // ✅ Error handler (improved: preserve status/message when possible)
  app.use((err: any, req: any, res: any, next: any) => {
    // Normalize common error shapes
    console.error('Unhandled error:', err);

    const status =
      err?.status ||
      err?.statusCode ||
      (err?.name === 'NotFoundError' ? 404 : undefined) ||
      500;

    // prefer explicit message, else try response body if axios error
    let message = err?.message || 'Internal Server Error';
    if (!message && err?.response?.data) {
      try {
        message = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
      } catch {
        message = 'Internal Server Error';
      }
    }

    res.status(status).json({ error: message });
  });


  // ✅ Start server
  app.listen(port, () => {
    console.log(`🚀 Express API running at http://localhost:${port}`);
  });
}

bootstrap();
