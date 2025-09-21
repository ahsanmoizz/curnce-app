import { Router, Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma.service';
import { JwtGuard } from '../../middleware/jwt.guard';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { applyRules } from "../rules/rules.engine";
import OpenAI from "openai";
import multer from 'multer';
import { parseBankCsv } from '@ufa/ingestion';

import { Decimal } from '@prisma/client/runtime/library';

export const ingestionRouter = Router();
const upload = multer(); // memory storage

// --- Initialize services ---
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const notificationsService = new NotificationsService(prisma, auditService);
const ledgerService = new LedgerService(prisma, auditService, notificationsService);

// --- Middleware ---
ingestionRouter.use(JwtGuard);

// ----------------- UPLOAD BANK CSV -----------------
ingestionRouter.post(
  "/bank-csv",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const file = req.file as Express.Multer.File;

      // ✅ Strong validation
      if (!file || !file.buffer) {
        return res.status(400).json({ message: "CSV file missing" });
      }

      const content = file.buffer.toString("utf-8");
      if (!content.trim().includes(",")) {
        return res.status(400).json({ message: "Invalid CSV format" });
      }

      let rows: any[];
      try {
        rows = parseBankCsv(content) || [];
      } catch (err) {
        console.error("CSV parse failed:", err);
        return res.status(400).json({ message: "Failed to parse CSV" });
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV empty or invalid format" });
      }

      const txs: any[] = [];

      for (const r of rows) {
        // Check duplicates
        const same = await prisma.transaction.findFirst({
          where: {
            tenantId: user.tenantId,
            occurredAt: {
              gte: new Date(new Date(r.date).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(r.date).setHours(23, 59, 59, 999)),
            },
            amount: new Decimal(r.amount),
            ...(r.description
              ? { description: { contains: r.description, mode: "insensitive" } }
              : {}),
            ...(r.reference ? { externalId: r.reference } : {}),
          },
        });

        if (same) {
          await prisma.alert.create({
            data: {
              tenantId: user.tenantId,
              level: "CRITICAL",
              code: "DUPLICATE_TX",
              message: `Possible duplicate: ${r.description}`,
              data: { date: r.date, amount: r.amount, ref: r.reference },
            },
          });
        }

        // Create transaction
        const t = await prisma.transaction.create({
          data: {
            tenantId: user.tenantId,
            description: r.description || "",
            externalId: r.reference || null,
            source: "bank_csv",
            occurredAt: new Date(r.date),
            amount: new Decimal(r.amount),
            currency: r.currency || "INR",
          },
        });

        txs.push(t);
      }

      return res.json({ imported: txs.length, txIds: txs.map((t) => t.id) });
    } catch (err: any) {
      console.error("CSV upload error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Upload failed" });
    }
  }
);

// ----------------- CONFIRM TRANSACTIONS -----------------
ingestionRouter.post('/confirm', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { txIds } = req.body;

    if (!Array.isArray(txIds) || txIds.length === 0) {
      return res.status(400).json({ message: 'txIds array required' });
    }

    const rules = await prisma.rule.findMany({
      where: { tenantId: user.tenantId, scope: 'accounting', enabled: true },
    });

    // ✅ dynamically fetch accounts
    const cashId = await getCashAccount(user.tenantId);
    const travelId = await getTravelAccount(user.tenantId);
    const salesId = await getSalesAccount(user.tenantId);

    for (const id of txIds) {
      const t = await prisma.transaction.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!t) continue;

      const ctx = {
        description: t.description || '',
        amount: Number(t.amount || 0),
        currency: t.currency || 'INR',
        date: t.occurredAt.toISOString().slice(0, 10),
        reference: t.externalId,
        source: t.source,
      };
      const action = applyRules(rules as any, ctx);

      const amount = Math.abs(Number(t.amount || 0)) || 0;
      const amt = amount || 100;

      const postings =
        action?.category?.startsWith('Expense:Travel')
          ? [
              { acc: travelId, debit: amt, credit: 0 },
              { acc: cashId, debit: 0, credit: amt },
            ]
          : [
              { acc: cashId, debit: amt, credit: 0 },
              { acc: salesId, debit: 0, credit: amt },
            ];

      const totalAmount = postings.reduce((sum, p) => sum + (p.debit || p.credit), 0);
      await prisma.transaction.update({
        where: { id: t.id },
        data: { amount: new Decimal(totalAmount) },
      });

      for (const p of postings) {
        await ledgerService.createEntry({
          tenantId: user.tenantId,
          type: p.debit > 0 ? 'DEBIT' : 'CREDIT',
          amount: p.debit > 0 ? p.debit : p.credit,
          accountId: String(p.acc),
          currency: t.currency || 'INR',
          description: t.description ?? undefined,
        });
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Confirm error:', err);
    return res.status(500).json({ message: err.message || 'Confirm failed' });
  }
});

// ----------------- CLASSIFY TRANSACTION -----------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function classifyWithOpenAI(text: string) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Classify this bank transaction into a category (Income, Expense:Travel, etc). Only return the category.",
      },
      { role: "user", content: text },
    ],
  });

  return resp.choices[0].message?.content?.trim() || "unknown";
}

ingestionRouter.post("/classify", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { txId } = req.body;

    if (!txId) return res.status(400).json({ message: "txId required" });

    const tx = await prisma.transaction.findFirst({
      where: { id: txId, tenantId: user.tenantId },
    });
    if (!tx) return res.status(400).json({ message: "transaction not found" });

    // ✅ classify using OpenAI
    const category = await classifyWithOpenAI(tx.description || "");

    await prisma.txClassificationLog.create({
      data: {
        tenantId: user.tenantId,
        transactionId: tx.id,
        modelVersion: "openai-gpt-4o-mini",
        input: { text: tx.description },
        output: { category },
        confidence: 0.9, // static for now
      },
    });

    return res.json({ txId: tx.id, category, confidence: 0.9 });
  } catch (err: any) {
    console.error("Classify error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Classification failed" });
  }
});

// ----------------- FETCH TRANSACTIONS -----------------
ingestionRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: { tenantId: user.tenantId } }),
    ]);

    return res.json({ items, total, page, limit });
  } catch (err: any) {
    console.error('Fetch transactions error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch transactions' });
  }
});
async function getCashAccount(tenantId: string) {
  const acc = await prisma.account.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { contains: "Cash", mode: "insensitive" } },
        { type: "ASSET" },
      ],
    },
  });
  if (!acc) throw new Error("Cash account not found. Please create it first.");
  return acc.id;
}

async function getTravelAccount(tenantId: string) {
  const acc = await prisma.account.findFirst({
    where: {
      tenantId,
      name: { contains: "Travel", mode: "insensitive" },
    },
  });
  if (!acc) throw new Error("Travel Expense account not found. Please create it first.");
  return acc.id;
}

async function getSalesAccount(tenantId: string) {
  const acc = await prisma.account.findFirst({
    where: {
      tenantId,
      type: "INCOME",
    },
  });
  if (!acc) throw new Error("Revenue/Sales account not found. Please create one.");
  return acc.id;
}
// ----------------- FETCH ALERTS -----------------
ingestionRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where: { tenantId: user.tenantId } }),
    ]);

    return res.json({ items, total, page, limit });
  } catch (err: any) {
    console.error('Fetch alerts error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch alerts' });
  }
});
