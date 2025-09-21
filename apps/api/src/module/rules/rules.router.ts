import { Router, Request, Response } from "express";
import { PrismaService } from "../../prisma.service";
import { JwtGuard } from "../../middleware/jwt.guard";

const prisma = new PrismaService();
export const rulesRouter = Router();

rulesRouter.use(JwtGuard);

// --- List all rules
rulesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const rules = await prisma.rule.findMany({
      where: { tenantId: (req.user as any).tenantId },
      orderBy: { priority: "asc" },
    });
    res.json(rules);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});

// --- Create new rule
rulesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const rule = await prisma.rule.create({
      data: {
        name: body.name,
        scope: body.scope || "global",
        whenExpr: body.whenExpr ?? {},
        thenAction: body.thenAction ?? {},
        priority: body.priority ?? 100,
        enabled: body.enabled ?? true,
        tenantId: (req.user as any).tenantId,
      },
    });
    res.json(rule);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});

// --- Update rule
rulesRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const rule = await prisma.rule.update({
      where: { id },
      data: {
        name: body.name,
        scope: body.scope,
        whenExpr: body.whenExpr,
        thenAction: body.thenAction,
        priority: body.priority,
        enabled: body.enabled,
      },
    });
    res.json(rule);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});

// --- Delete rule
rulesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.rule.delete({ where: { id } });
    res.json({ status: "ok" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});
