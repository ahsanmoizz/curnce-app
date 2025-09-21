import { Router } from 'express';
import { PrismaService } from '../../prisma.service';
import { ContractsService } from './contracts.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import multer from 'multer';

const contractsRouter = Router();
const prisma = new PrismaService();
const svc = new ContractsService(
  prisma,
  new (require('../notifications/notifications.service').NotificationsService)(prisma),
  new (require('../audit/audit.service').AuditService)(prisma),
);

const upload = multer(); // memory storage by default

// -------------------------
// PDF Upload + Analysis
// -------------------------

contractsRouter.post('/contracts/upload', JwtGuard, upload.single('file'), async (req, res, next) => {
  try {
    const doc = await svc.uploadPdf(req.user!.tenantId, req.file as Express.Multer.File);
    res.json({ documentId: doc.id, s3Key: doc.s3Key, name: doc.name, sha256: doc.sha256 });
  } catch (err) {
    next(err);
  }
});

contractsRouter.post('/contracts/:id/analyze', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.analyzeDocument(req.user!.tenantId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

contractsRouter.get('/contracts/:id/analysis', JwtGuard, async (req, res, next) => {
  try {
    const result = await svc.getAnalysis(req.user!.tenantId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// -------------------------
// Contract Lifecycle
// -------------------------

contractsRouter.post('/contracts', JwtGuard,  async (req, res, next) => {
  try {
    const { title, type, content } = req.body;
    const contract = await svc.createContract(req.user!.tenantId, title, type, content, req.user!.id || req.user!.userId || 'system');
    res.json(contract);
  } catch (err) {
    next(err);
  }
});

contractsRouter.post('/contracts/:id/version', JwtGuard,  async (req, res, next) => {
  try {
    const version = await svc.addVersion(req.params.id, req.body.content, req.user!.id || req.user!.userId || 'system', req.user!.tenantId);
    res.json(version);
  } catch (err) {
    next(err);
  }
});

contractsRouter.post('/contracts/:id/sign', JwtGuard, async (req, res, next) => {
  try {
    const sig = await svc.signContract(req.params.id, req.user!.id || req.user!.userId || 'system', req.body.role, req.body.signature, req.user!.tenantId);
    res.json(sig);
  } catch (err) {
    next(err);
  }
});

contractsRouter.patch('/contracts/:id/status', JwtGuard,  async (req, res, next) => {
  try {
    const updated = await svc.updateStatus(req.params.id, req.body.status, req.user!.tenantId, req.user!.id || req.user!.userId || 'system');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

contractsRouter.get('/contracts', JwtGuard, async (req, res, next) => {
  try {
    const contracts = await svc.listContracts(req.user!.tenantId, req.query.status as string);
    res.json(contracts);
  } catch (err) {
    next(err);
  }
});

contractsRouter.get('/contracts/:id', JwtGuard, async (req, res, next) => {
  try {
    const c = await svc.getContract(req.params.id, req.user!.tenantId);
    res.json(c);
  } catch (err) {
    next(err);
  }
});

export { contractsRouter };
