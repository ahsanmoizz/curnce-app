// apps/api/src/module/docs/docs.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import multer from 'multer';
import crypto from 'crypto';
import AWS from 'aws-sdk';

export const corpdocsRouter = Router();
const upload = multer(); // memory storage by default

// --- Initialize services ---
const prisma = new PrismaService();
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,       // ✅ fixed
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY, // ✅ fixed
  region: process.env.AWS_REGION || "auto",        // ✅ add region
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});
const bucket = process.env.S3_BUCKET || 'ufa-docs';

// --- Middleware ---
corpdocsRouter.use(JwtGuard);

// ----------------- UPLOAD DOCUMENT -----------------
corpdocsRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const file = req.file as Express.Multer.File;
    if (!file) return res.status(400).json({ message: 'file required' });

    const sha = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const key = `${user.tenantId}/${Date.now()}_${file.originalname}`;

    await s3.putObject({ Bucket: bucket, Key: key, Body: file.buffer }).promise();

    const doc = await prisma.document.create({
      data: {
        tenantId: user.tenantId,
        type: 'contract',
        name: file.originalname,
        s3Key: key,
        sha256: sha,
      },
    });

    res.json({ documentId: doc.id });
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
// ----------------- LIST DOCUMENTS -----------------
corpdocsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const docs = await prisma.document.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
  }
});

// ----------------- GET DOCUMENT -----------------
corpdocsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!doc) return res.status(404).json({ message: 'document not found' });

    res.json(doc);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
