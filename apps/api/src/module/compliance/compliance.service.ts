import {
  Injectable,
  BadRequestException,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AIService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import OpenAI from "openai";

import dayjs from 'dayjs';

// RBI/FEMA engine types/service
import { AiLegalService } from '../ai-legal/ai-legal.service';
import { ComplianceDecision } from '../ai-legal/ai-legal.types';
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  constructor(
    private prisma: PrismaService,
    private ai: AIService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private readonly aiLegal: AiLegalService,
  ) {}

  private async safeClassifyTransaction(description: string, amount: number, metadata: any) {
    try {
      const aiResult = await this.ai.classifyTransaction(description, amount, metadata);
      return { success: true, output: aiResult };
    } catch (err: any) {
      this.logger.error('AI classifyTransaction failed', err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async safeComplianceCheck(text: string) {
    try {
      const aiResult = await this.ai.complianceCheck(text);
      return { success: true, output: aiResult };
    } catch (err: any) {
      this.logger.error('AI complianceCheck failed', err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async safeAiLegalCheck(payment: any) {
    try {
      const res = await this.aiLegal.checkPayment(payment);
      return { success: true, output: res };
    } catch (err: any) {
      this.logger.error('AiLegal.checkPayment failed', err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }
  // ---------------- EXISTING TAX CONFIG ----------------

  async listConfig(tenantId: string) {
    return this.prisma.taxConfig.findMany({ where: { tenantId } });
  }

async upsertConfig(tenantId: string, body: any) {
  if (!body.country || !body.taxType || !body.rate || !body.filingCycle || !body.accountCode) {
    throw new BadRequestException('Missing fields');
  }

  // Try to find an existing config for the tenant + taxType (avoid duplicates)
  const existing = await this.prisma.taxConfig.findFirst({
    where: { tenantId, taxType: body.taxType },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return this.prisma.taxConfig.update({
      where: { id: existing.id },
      data: { ...body },
    });
  }

  return this.prisma.taxConfig.create({
    data: { tenantId, ...body },
  });
}
  /**
   * Filing report by month (YYYY-MM).
   */
  async filingReport(tenantId: string, period: string) {
    const [year, month] = period.split('-').map((x: string) => parseInt(x, 10));
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const entries = await this.prisma.entry.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      include: { account: true },
    });

    const sums: Record<string, { debit: number; credit: number }> = {};
    for (const e of entries) {
      const code = e.account.code;
      sums[code] = sums[code] || { debit: 0, credit: 0 };
      sums[code].debit += Number(e.debit);
      sums[code].credit += Number(e.credit);
    }

    const configs = await this.prisma.taxConfig.findMany({ where: { tenantId } });

    const byTaxType: Record<string, any> = {};
    for (const cfg of configs) {
      const code = cfg.accountCode;
      const net = (sums[code]?.credit || 0) - (sums[code]?.debit || 0);
      if (!byTaxType[cfg.taxType]) byTaxType[cfg.taxType] = [];
      byTaxType[cfg.taxType].push({ accountCode: code, jurisdiction: cfg.jurisdiction, net });
    }

    return { period, byTaxType };
  }

  /**
   * Auto-post tax entries when transactions are created.
   */
  async postTaxEntriesForTransaction(
    tenantId: string,
    txId: string,
    taxCode: string,
    amount: number,
    currency: string,
  ) {
    const map = await this.prisma.taxConfig.findFirst({
      where: { tenantId, taxType: { contains: 'GST' } },
      orderBy: { createdAt: 'desc' },
    });
   if (!map) {
  this.logger.warn(`No tax config found for tenant=${tenantId} tx=${txId} taxCode=${taxCode}`);
  return;
}

    const isOutput = taxCode.toUpperCase().includes('OUTPUT');
    const isInput = taxCode.toUpperCase().includes('INPUT');
    if (!isOutput && !isInput) return;

    const account = await this.prisma.account.findFirst({
      where: { tenantId, code: map.accountCode },
    });
    if (!account) {
  this.logger.warn(`Tax account ${map.accountCode} not found for tenant=${tenantId}`);
  return;
}

    const taxAmount = this.deriveRateFromCode(taxCode) * Math.abs(amount);

    await this.prisma.entry.create({
      data: {
        tenantId,
        transactionId: txId,
        accountId: account.id,
        debit: new Decimal(isInput ? taxAmount : 0),
        credit: new Decimal(isOutput ? taxAmount : 0),
        currency,
      },
    });
  }

  private deriveRateFromCode(code: string): number {
    const m = code.match(/(\d+(\.\d+)?)/);
    if (!m) return 0;
    return parseFloat(m[1]) / 100.0;
  }
  // ---------------- NEW AI COMPLIANCE (existing features) ----------------
  async classifyTransactionById(tenantId: string, txId: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id: txId, tenantId } });
    if (!tx) {
      throw new NotFoundException('transaction not found');
    }

    const metadata = {
      source: tx.source,
      occurredAt: tx.occurredAt,
      externalId: tx.externalId,
    };

    const safe = await this.safeClassifyTransaction(tx.description || '', 0, metadata);

    const normalizedOutput: any = safe.success
      ? safe.output ?? { error: 'AI returned no output' }
      : { error: safe.error ?? 'Unknown AI error' };

    await this.prisma.txClassificationLog.create({
      data: {
        tenantId,
        transactionId: tx.id,
        modelVersion: safe.success
          ? safe.output?.modelVersion || process.env.OPENAI_MODEL || 'unknown'
          : 'failed',
        input: { description: tx.description, amount: 0, metadata },
        output: normalizedOutput,
        confidence: Number(safe.success ? safe.output?.confidence ?? 0 : 0),
      },
    });

    if (!safe.success) {
      await this.notifications.sendNotification(tenantId, 'ai_classify_failed', {
        txId: tx.id,
        error: safe.error,
      });
      await this.audit.logAction({
        tenantId,
        userId: 'system',
        action: 'AI_CLASSIFY_FAILED',
        details: { txId: tx.id, error: safe.error },
      });
      throw new BadRequestException(`AI classification failed: ${safe.error}`);
    }

    if (safe.output?.riskLevel?.toUpperCase() === 'HIGH') {
      await this.notifications.sendNotification(tenantId, 'compliance_high_risk', {
        txId: tx.id,
        classification: safe.output,
      });
      await this.audit.logAction({
        tenantId,
        userId: 'system',
        action: 'COMPLIANCE_FLAG',
        details: { txId: tx.id, classification: safe.output },
      });
    }

    return safe.output!;
  }
  async classifyInline(tenantId: string, description: string, amount: number, metadata: any) {
    const safe = await this.safeClassifyTransaction(description, amount, metadata);

    const normalizedOutput: any = safe.success
      ? safe.output ?? { error: 'AI returned no output' }
      : { error: safe.error ?? 'Unknown AI error' };

    await this.prisma.txClassificationLog.create({
      data: {
        tenantId,
        transactionId: null,
        modelVersion: safe.success
          ? safe.output?.modelVersion || process.env.OPENAI_MODEL || 'unknown'
          : 'failed',
        input: { description, amount, metadata },
        output: normalizedOutput,
        confidence: Number(safe.success ? safe.output?.confidence ?? 0 : 0),
      },
    });

    if (!safe.success) {
      await this.notifications.sendNotification(tenantId, 'ai_inline_classify_failed', {
        description,
        error: safe.error,
      });
      return { error: safe.error, failed: true };
    }

    return safe.output!;
  }


async runComplianceAudit(tenantId: string, period: string) {
  // compute from/to same as before
  let from: Date, to: Date;
  if (period === 'last7d') {
    to = new Date();
    from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  } else if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0, 23, 59, 59);
  } else {
    to = new Date();
    from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  }

  // Deduplicate: if a report for tenant+period+type AI_AUDIT already exists, return it
  const existingReport = await this.prisma.complianceReport.findFirst({
    where: { tenantId, period, type: 'AI_AUDIT' },
  });
  if (existingReport) {
    this.logger.log(`Audit for tenant=${tenantId} period=${period} already exists, skipping`);
    return existingReport;
  }

  const txs = await this.prisma.transaction.findMany({
    where: { tenantId, occurredAt: { gte: from, lte: to } },
    orderBy: { occurredAt: 'asc' },
  });

  const reportEntries: any[] = [];
  const CONCURRENCY = Number(process.env.COMPLIANCE_AI_CONCURRENCY || 5);

 // processTx will handle single tx classification + logging
const processTx = async (tx: any) => {
  try {
    // skip if already classified
    const existing = await this.prisma.txClassificationLog.findFirst({
      where: { tenantId, transactionId: tx.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      reportEntries.push({
        txId: tx.id,
        skipped: true,
        existing: existing.output ?? null,
      });
      return;
    }

    const safe = await this.safeClassifyTransaction(tx.description || '', 0, {
      source: tx.source,
      occurredAt: tx.occurredAt,
    });

    // normalize output so Prisma never gets undefined
    const normalizedOutput: any = safe.success
      ? (safe.output ?? { error: 'AI returned no output' })
      : { error: safe.error ?? 'Unknown AI error' };

    await this.prisma.txClassificationLog.create({
      data: {
        tenantId,
        transactionId: tx.id,
        modelVersion: safe.success
          ? (safe.output?.modelVersion || process.env.OPENAI_MODEL || 'unknown')
          : 'failed',
        input: { description: tx.description, amount: 0 },
        output: normalizedOutput,
        confidence: Number(safe.success ? safe.output?.confidence ?? 0 : 0),
      },
    });

    if (!safe.success) {
      reportEntries.push({ txId: tx.id, classification: null, error: safe.error });
      await this.notifications.sendNotification(tenantId, 'ai_classify_failed', { txId: tx.id, error: safe.error });
      await this.audit.logAction({
        tenantId,
        userId: 'system',
        action: 'AI_CLASSIFY_FAILED',
        details: { txId: tx.id, error: safe.error },
      });
      return;
    }

    if (safe.output?.riskLevel?.toUpperCase() === 'HIGH') {
      await this.notifications.sendNotification(tenantId, 'compliance_high_risk', { txId: tx.id, classification: safe.output });
      await this.audit.logAction({
        tenantId,
        userId: 'system',
        action: 'COMPLIANCE_FLAG',
        details: { txId: tx.id, classification: safe.output },
      });
    }

    reportEntries.push({ txId: tx.id, classification: safe.output! });
  } catch (err: any) {
    this.logger.error('processTx failed', err?.message || err);
    reportEntries.push({ txId: tx.id, error: err?.message || String(err) });
  }
};

  // simple batching to bound concurrency
  for (let i = 0; i < txs.length; i += CONCURRENCY) {
    const batch = txs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((t) => processTx(t)));
  }

  const report = {
    period,
    generatedAt: new Date(),
    summary: {
      total: reportEntries.length,
      byRisk: reportEntries.reduce((acc: any, e: any) => {
        const r = (e.classification?.riskLevel || 'LOW');
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {}),
    },
    entries: reportEntries,
  };

  // Persist but double-check again before creating (race-safety)
  const already = await this.prisma.complianceReport.findFirst({
    where: { tenantId, period, type: 'AI_AUDIT' },
  });
  if (already) return already;

  return this.prisma.complianceReport.create({
    data: {
      tenantId,
      period,
      type: 'AI_AUDIT',
      status: 'generated',
      data: report,
    },
  });
}
  async getReport(tenantId: string, period: string) {
    return this.prisma.complianceReport.findFirst({ where: { tenantId, period } });
  }
   async reviewDocument(tenantId: string, dto: { content: string }) {
  // 1. Ensure a Document exists
  const doc = await this.prisma.document.create({
    data: {
      tenantId,
      type: 'adhoc',
      name: `Review-${Date.now()}`,
      s3Key: 'adhoc',
      sha256: 'adhoc',
    },
  });

  // 2. Call OpenAI directly
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a legal compliance assistant. Review the given document text and highlight potential risks." },
      { role: "user", content: dto.content },
    ],
  });

  const answer = completion.choices[0].message?.content || "⚠️ No response from AI";

  // 3. Save review in DB
  return this.prisma.documentReview.create({
    data: {
      tenantId,
      documentId: doc.id,
      modelVersion: process.env.OPENAI_MODEL || "gpt-4o-mini",
      output: { answer },   // 👈 Store AI output in JSON field
      riskLevel: "LOW",     // or derive from AI response
      content: dto.content, // original document text
    },
  });
}
  // ---------------- DAY 9: Compliance Reporting ----------------

  async generateReport(tenantId: string, type: string, filters?: any) {
    const [totalTx, disputes, refunds] = await Promise.all([
      this.prisma.transaction.count({ where: { tenantId } }),
      this.prisma.dispute.count({ where: { tenantId } }),
      this.prisma.refund.count({ where: { tenantId } }),
    ]);

    const summary = {
      totalTx,
      disputes,
      refunds,
      generatedAt: new Date(),
    };

    const period = filters?.period || new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const report = await this.prisma.complianceReport.create({
      data: {
        tenantId,
        type,
        period,
        status: 'completed',
        data: summary,
      },
    });

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'COMPLIANCE_REPORT',
      details: { type, summary },
    });

    await this.notifications.sendNotification(tenantId, 'compliance_report_created', {
      type,
      summary,
      reportId: report.id,
    });

    return report;
  }

  async listReports(tenantId: string) {
    return this.prisma.complianceReport.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
async getReportById(reportId: string) {
    const report = await this.prisma.complianceReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('report not found');
    return report;
  }
  // ---------------- NEW: RBI/FEMA compliance check for PaymentIntent ----------------

  /**
   * Runs compliance check and persists the result.
   * Ensures the payment belongs to the tenant invoking it.
   */
    async runCheck(paymentId: string, tenantId: string) {
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    const safe = await this.safeAiLegalCheck(payment);
    if (!safe.success) {
      throw new BadRequestException(`AI legal check failed: ${safe.error}`);
    }

    const output = safe.output!;
    return this.prisma.complianceCheck.create({
      data: {
        tenantId,
        paymentId,
        status: output.status,
        rules: output.rules as unknown as any,
        notes: output.notes,
      },
    });
  }

}
