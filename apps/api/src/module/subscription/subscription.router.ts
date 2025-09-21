import { Router } from "express";
import bodyParser from "body-parser";
import { PrismaService } from "../../prisma.service";
import { SubscriptionService } from "./subscription.service";
import { jwtMiddleware } from "../../middleware/jwt.middleware";

const prisma = new PrismaService();
const service = new SubscriptionService(prisma);

// ✅ Public (SuperAdmin) router
const superadminRouter = Router();

superadminRouter.post("/plans", async (req, res, next) => {
  try {
    const { name, price, interval, currency } = req.body;
    const plan = await service.createPlan(
      name,
      Number(price),
      interval,
      currency || "USD"
    );
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

superadminRouter.get("/plans", async (req, res, next) => {
  try {
    res.json(await service.listPlans());
  } catch (err) {
    next(err);
  }
});

superadminRouter.get("/tenants", async (req, res, next) => {
  try {
    res.json(await service.listTenantsWithBilling());
  } catch (err) {
    next(err);
  }
});

superadminRouter.get("/tenants/:id", async (req, res, next) => {
  try {
    res.json(await service.tenantDetails(req.params.id));
  } catch (err) {
    next(err);
  }
});

// ✅ Tenant-protected router
const tenantRouter = Router();

tenantRouter.get("/billing/me", jwtMiddleware, async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

    res.json(await service.myBilling(tenantId));
  } catch (err) {
    next(err);
  }
});

tenantRouter.post("/paypal/create-order/:planId", jwtMiddleware, async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

    const { planId } = req.params;
    const result = await service.createPayPalOrder(tenantId, planId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

tenantRouter.post("/paypal/capture", async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const result = await service.capturePayPalOrder(orderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { superadminRouter, tenantRouter };
