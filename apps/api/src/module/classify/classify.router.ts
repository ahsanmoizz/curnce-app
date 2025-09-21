import { Router } from 'express';
import { ClassifyService } from './classify.service';
import { PrismaService } from '../../prisma.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';

export function createClassifyRouter() {
  const router = Router();

  const prisma = new PrismaService();
  const svc = new ClassifyService(prisma);

  router.use(jwtMiddleware);

  router.post('/transaction', async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const body = req.body;
      const data = await svc.classifyTransaction(tenantId, {
        id: body.transactionId,
        description: body.description,
        amount: body.amount,
        counterparty: body.counterparty,
        branch: body.branch,
        currency: body.currency,
        country: body.country,
      });
      res.json(data);
    } catch (err: any) {
      console.error('❌ Classify error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
