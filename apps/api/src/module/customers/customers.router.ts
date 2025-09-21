// apps/api/src/module/customers/customers.router.ts
import { Router, Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { PrismaService } from '../../prisma.service';
import { CustomersService } from './customers.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { RolesGuard } from '../../middleware/roles.guard';
import { Roles } from '../../middleware/roles.decorator';

export const customersRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const customersService = new CustomersService(prisma);

// --- Middleware ---
customersRouter.use(JwtGuard);

// Multer config for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ----------------- CREATE CUSTOMER -----------------
customersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const body = req.body;
    const customer = await customersService.create(user.tenantId, body);
    res.json(customer);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- GET CUSTOMER -----------------
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const customer = await customersService.get(user.tenantId, id);
    res.json(customer);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- SET STATUS -----------------
customersRouter.post('/:id/status', Roles('ADMIN'), RolesGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { status } = req.body as { status: 'active'|'under_review'|'blocked' };
    const updated = await customersService.setStatus(user.tenantId, id, status);
    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- UPLOAD DOCUMENT -----------------
customersRouter.post(
  '/:id/documents/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const file = (req as any).file as Express.Multer.File;
      const result = await customersService.uploadDocument(user.tenantId, id, file);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
  }
);

// ----------------- LIST ALL CUSTOMERS -----------------
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { page = '1', limit = '20', status, q } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { tenantId: user.tenantId };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);

    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
