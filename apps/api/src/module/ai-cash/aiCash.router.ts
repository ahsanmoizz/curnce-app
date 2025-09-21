import { Router } from "express";
import { PrismaService } from "../../prisma.service";
import { AICashService } from "./aiCash.service";
import { jwtMiddleware } from "../../middleware/jwt.middleware";
import multer from "multer";

const upload = multer();

export function createAICashRouter() {
  const router = Router();
  const prisma = new PrismaService();
  const aiCash = new AICashService(prisma);

  router.use(jwtMiddleware);

  // 📥 Upload docs → stored in DB (not filesystem)
  router.post("/upload", upload.single("file"), async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const doc = await aiCash.saveDocument(tenantId, req.file);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 📂 List docs
  router.get("/docs", async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const docs = await prisma.financeDocument.findMany({
        where: { tenantId },
        orderBy: { uploadedAt: "desc" },
      });
      res.json(docs);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 🤖 Ask AI
  router.post("/ask", async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { prompt } = req.body;
      const result = await aiCash.askAI(tenantId, prompt);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 📑 Export (CSV, Excel, PDF)
  router.get("/export", async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const format = req.query.format || "excel";
      const file = await aiCash.generateReport(tenantId, format);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${file.name}`
      );
      res.setHeader("Content-Type", file.mime);

      res.send(file.buffer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
 router.get("/summary", async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const summary = await aiCash.generateFinancialSummary(tenantId);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
  
