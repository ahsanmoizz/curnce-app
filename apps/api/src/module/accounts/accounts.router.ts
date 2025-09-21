import { Router } from 'express';
import { PrismaService } from '../../prisma.service';
import { AccountCreateSchema } from '@ufa/shared';
import { JwtGuard} from '../../middleware/jwt.guard';

const accountsRouter = Router();
const prisma = new PrismaService();


// Create account
accountsRouter.post('/accounts', JwtGuard, async (req, res, next) => {
  try {
    const data = AccountCreateSchema.parse(req.body);

    // ✅ tenantId inject from logged-in user
    const account = await prisma.account.create({
      data: { ...data, tenantId: req.user!.tenantId },
    });

    res.json(account);
  } catch (err) {
    next(err);
  }
});

// List accounts
accountsRouter.get('/accounts', JwtGuard, async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { code: 'asc' },
    });

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});


export { accountsRouter };
