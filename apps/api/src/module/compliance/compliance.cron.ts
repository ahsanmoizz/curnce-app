// apps/api/src/module/compliance/compliance.cron.ts
import cron from 'node-cron';
import { PrismaService } from '../../prisma.service';
import { ComplianceService } from './compliance.service';
import { AIService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiLegalService } from '../ai-legal/ai-legal.service';
import { defaultRulePacks, runFema, runGst } from '../ai-legal/rules';

const prisma = new PrismaService();
const ai = new AIService();
const audit = new AuditService(prisma);
const notifications = new NotificationsService(prisma,audit);
const aiLegal = new AiLegalService(prisma, defaultRulePacks);

const compliance = new ComplianceService(prisma, ai, audit, notifications, aiLegal);

// ✅ Weekly audit: every Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
  console.log('[ComplianceCron] Starting weekly compliance audit for all tenants');
  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
  try {
    const period = 'last7d';
    // skip if report already exists
    const existing = await prisma.complianceReport.findFirst({
      where: { tenantId: t.id, period, type: 'AI_AUDIT' },
    });
    if (existing) {
      console.log(`[ComplianceCron] Skipping tenant=${t.id} period=${period} (already exists)`);
      continue;
    }

    await compliance.runComplianceAudit(t.id, period);
    console.log(`[ComplianceCron] Weekly audit complete tenant=${t.id} period=${period}`);
  } catch (err: any) {
    console.error(`[ComplianceCron] Weekly audit failed tenant=${t.id}`, err?.message || err);
    try {
      await notifications.sendInApp(t.id, `Weekly compliance audit failed: ${err?.message || String(err)}`, 'error');
    } catch (e) {
      console.error('Failed to send notifications about audit failure', e);
    }
  }
}
});

// ✅ Monthly audit: 1st of month at 02:00
cron.schedule('0 2 1 * *', async () => {
  console.log('[ComplianceCron] Starting monthly compliance audit for all tenants');
  const tenants = await prisma.tenant.findMany();
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  for (const t of tenants) {
    try {
      await compliance.runComplianceAudit(t.id, period);
      console.log(`[ComplianceCron] Monthly audit complete tenant=${t.id} period=${period}`);
    } catch (err: any) {
      console.error(`[ComplianceCron] Monthly audit failed tenant=${t.id}`, err.message);
    }
  }
});

export {};
