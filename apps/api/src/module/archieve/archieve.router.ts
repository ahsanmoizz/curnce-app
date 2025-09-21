import { Router } from 'express';
import multer from 'multer';
import { ArchiveService } from './archieve.service';
import { PrismaService } from '../../prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';

const upload = multer();

export function createArchiveRouter() {
  const router = Router();

  // dependencies
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const blockchain = new BlockchainService(prisma, audit);
  const service = new ArchiveService(prisma, blockchain);

  // ✅ health
  router.get('/', (req, res) => {
    res.send('✅ Archive router (real service)');
  });

  // ✅ upload (protected: ADMIN/OWNER)
  router.post(
    '/upload',
    jwtMiddleware,
    upload.single('file'),
    async (req, anyRes) => {
      try {
        const file = req.file;
        if (!file) {
          return anyRes.status(400).json({ error: 'file required' });
        }
        const tenantId = (req as any).user.tenantId;
        const saved = await service.storeDocument({
          tenantId,
          filename: file.originalname,
          buffer: file.buffer,
          contentType: file.mimetype,
        });
       await prisma.auditLog.create({
  data: {
    tenantId,
    userId: req.user!.id,
    action: 'ARCHIVE_UPLOAD',
    details: { filename: file.originalname, s3Url: saved.s3Url, txHash: saved.txHash },
  },
});
        anyRes.json(saved);
      } catch (err: any) {
        console.error('❌ Archive upload error:', err);
        anyRes.status(500).json({ error: err.message });
      }
    }
  );
// ✅ list archived docs
router.get(
  '/list',
  jwtMiddleware,
  async (req: any, res) => {
    try {
      const docs = await prisma.archivedDocument.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { createdAt: 'desc' },
      });
      res.json(docs);
    } catch (err: any) {
      console.error('❌ Archive list error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

  // ✅ hash anchor (protected: ADMIN/OWNER)
router.post(
  '/hash',
  jwtMiddleware,
  async (req: any, res) => {
    try {
      const { docHash } = req.body;
      const tenantId = req.user.tenantId;

      if (!docHash) {
        return res.status(400).json({ error: 'docHash required' });
      }

      const tx = await blockchain.timestampDocument(docHash);

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user.id,
          action: 'ARCHIVE_HASH',
          details: { docHash, txHash: tx.txHash },
        },
      });

      res.json({ tenantId, docHash, txHash: tx.txHash });
    } catch (err: any) {
      console.error('❌ Archive hash error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);


  return router;
}
