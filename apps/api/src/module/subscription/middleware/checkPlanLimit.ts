import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../prisma.service";

const prisma = new PrismaService();

/**
 * Enforce trial (7 days) or active subscription.
 * Checks tenantId from JWT (req.user.tenantId).
 */
export async function enforceSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const now = new Date();

    // ✅ allow if still in trial
    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) > now) {
      return next();
    }

    // ✅ allow if active subscription exists
    const activeSub = await prisma.subscription.findFirst({
      where: { tenantId, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (
      activeSub &&
      activeSub.renewalDate &&
      new Date(activeSub.renewalDate) > now
    ) {
      return next();
    }

    // ❌ block if no trial and no active sub
    return res.status(402).json({
      error: "Subscription required. Please subscribe to continue.",
    });
  } catch (err) {
    console.error("enforceSubscription error:", err);
    return res.status(500).json({ error: "Subscription check failed" });
  }
}
