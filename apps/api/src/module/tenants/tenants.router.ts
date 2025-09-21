// src/module/tenants/tenants.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';

import { AuditService } from '../audit/audit.service';
import { randomBytes } from 'crypto';

export default function createTenantsRouter() {
  const router = Router();
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);

  // Guards
  router.use(jwtMiddleware, rolesMiddleware(['OWNER', 'ADMIN']));
router.get('/', async (req: Request, res: Response) => {
   
  const tenants = await prisma.tenant.findMany();
  res.json(tenants);
});

  // POST /v1/tenants
    router.get("/", async (req: Request, res: Response, next) => {
    try {
      const tenants = await prisma.tenant.findMany();
      res.json({ success: true, data: tenants });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/tenants/me
 router.get('/me', async (req: any, res: Response) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    res.json(tenant);
  });
  
// PATCH /v1/tenants/:id  (update basic tenant fields)
router.patch('/:id', async (req: any, res: Response) => {
  try {
    const { name, country, currency, profilePicture } = req.body;

    // ✅ validate base64 image
    if (profilePicture && typeof profilePicture === "string") {
      if (!profilePicture.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid profilePicture format" });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(country !== undefined ? { country } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(profilePicture !== undefined ? { profilePicture } : {}),
      },
    });

    await audit.logAction({
      tenantId: req.params.id,
      userId: req.user?.sub || "system",   // ✅ use JWT sub
      action: "TENANT_UPDATE",
      details: { tenantId: req.params.id },
      ip: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

  // GET /v1/tenants/:id
  router.get('/:id', async (req, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    res.json(tenant);
  });

  // PATCH /v1/tenants/:id/status
  router.patch('/:id/status', async (req: any, res) => {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(403).json({ message: 'Invalid status' });
    }
    const updated = await prisma.tenant.update({ where: { id: req.params.id }, data: { status } });

    await audit.logAction({
      tenantId: req.params.id,
      userId: req.user?.id || req.user?.userId || 'admin',
      action: 'TENANT_STATUS_UPDATE',
      details: { tenantId: req.params.id, status },
    });

    res.json({ success: true, tenant: updated });
  });

  // POST /v1/tenants/:id/reset-secret
  router.post('/:id/reset-secret', async (req: any, res) => {
    const newSecret = randomBytes(32).toString('hex');
    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { apiSecret: newSecret },
    });

    await audit.logAction({
      tenantId: req.params.id,
      userId: req.user?.id || req.user?.userId || 'admin',
      action: 'TENANT_SECRET_RESET',
      details: { tenantId: req.params.id },
    });

    res.json({ newSecret, tenantId: updated.id });
  });

  // GET /v1/tenants/stats
  router.get('/stats', async (req, res) => {
    const count = await prisma.tenant.count();
    const active = await prisma.tenant.count({ where: { status: 'active' } });
    res.json({ count, active });
  });

  return router;
}
