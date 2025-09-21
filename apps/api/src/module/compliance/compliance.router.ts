import { Router } from 'express';
import { PrismaService } from '../../prisma.service';
import { ComplianceService } from './compliance.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';

// --- Simple in-memory tenant rate limiter for AI endpoints ---
const aiRateBucket = new Map<string, number[]>();
const AI_WINDOW_MS = 60_000; // 1 minute
const AI_MAX = Number(process.env.COMPLIANCE_AI_RATE_MAX || 10);

function aiRateLimitCheck(tenantId: string) {
  const now = Date.now();
  const arr = aiRateBucket.get(tenantId) || [];
  const pruned = arr.filter((t) => now - t < AI_WINDOW_MS);
  if (pruned.length >= AI_MAX) {
    const err: any = new Error('Rate limit exceeded for AI endpoints. Try again shortly.');
    err.status = 429;
    throw err;
  }
  pruned.push(now);
  aiRateBucket.set(tenantId, pruned);
}

const complianceRouter = Router();
const prisma = new PrismaService();
const svc = new ComplianceService(
  prisma,
  new (require('../ai/ai.service').AIService)(prisma),
  new (require('../audit/audit.service').AuditService)(prisma),
  new (require('../notifications/notifications.service').NotificationsService)(prisma),
  new (require('../ai-legal/ai-legal.service').AiLegalService)(prisma),
);

// ---------------- EXISTING ----------------

// List config
complianceRouter.get('/compliance/config', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.listConfig(req.user!.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Upsert config
complianceRouter.post('/compliance/config', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.upsertConfig(req.user!.tenantId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Filing report
complianceRouter.get('/compliance/report/filing', JwtGuard, async (req, res, next) => {
  try {
    if (!req.query.period) {
      return res.status(400).json({ error: "Missing ?period" });
    }
    const result = await svc.filingReport(req.user!.tenantId, req.query.period as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});



// ---------------- NEW AI ----------------

// Inline classify
complianceRouter.post('/compliance/classify', JwtGuard, async (req, res, next) => {
  try {
    aiRateLimitCheck(req.user!.tenantId);
    const { description, amount, metadata } = req.body;
    const result = await svc.classifyInline(req.user!.tenantId, description, Number(amount || 0), metadata || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Classify by txId
complianceRouter.post('/compliance/classify/tx/:txId', JwtGuard, async (req, res, next) => {
  try {
    aiRateLimitCheck(req.user!.tenantId);
    const result = await svc.classifyTransactionById(req.user!.tenantId, req.params.txId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Review document (OWNER/ADMIN only)
complianceRouter.post('/compliance/review', JwtGuard,  async (req, res, next) => {
  try {
    aiRateLimitCheck(req.user!.tenantId);
   const result = await svc.reviewDocument(req.user!.tenantId, { content: req.body.content });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Run compliance audit (OWNER/ADMIN only)
complianceRouter.get('/compliance/report/:period', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.getReport(req.user!.tenantId, req.params.period);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate report (ADMIN only)
complianceRouter.post('/compliance/report', JwtGuard,  async (req, res, next) => {
  try {
    const result = await svc.generateReport(
      req.user!.tenantId,
      req.body.type,
      { period: req.body.period }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// List reports
complianceRouter.get('/compliance/reports', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.listReports(req.user!.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get report by ID
complianceRouter.get('/compliance/report/id/:id', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.getReportById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// RBI/FEMA check payment
complianceRouter.post('/compliance/check/:paymentId', JwtGuard, async (req, res, next) => {
  try {
    aiRateLimitCheck(req.user!.tenantId);
    const result = await svc.runCheck(req.params.paymentId, req.user!.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { complianceRouter };
