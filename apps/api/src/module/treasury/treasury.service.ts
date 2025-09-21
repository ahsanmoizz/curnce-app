import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

type ForecastHorizon = 'daily' | 'weekly' | 'monthly';

@Injectable()
export class TreasuryService {
  private readonly SYSTEM_USER_ID = 'system';

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // ---- Bank Accounts ----
  async createBankAccount(
    tenantId: string,
    dto: { name: string; bankName?: string; accountNo: string; currency: string; openingBal?: number },
  ) {
    const acc = await this.prisma.bankAccount.create({
      data: { tenantId, ...dto, openingBal: dto.openingBal ?? 0 },
    });

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'bank_account_created',
      details: acc,
    });

    return acc;
  }

  async listBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({ where: { tenantId } });
  }

  // ---- Cash Forecast ----
  async generateForecast(tenantId: string, horizon: ForecastHorizon, startDate: Date, endDate: Date) {
    const collections = await this.prisma.collectionPlan.aggregate({
      where: { tenantId, expectedOn: { gte: startDate, lte: endDate }, status: { in: ['planned', 'overdue'] } },
      _sum: { amount: true },
    });

    const payRuns = await this.prisma.paymentRun.aggregate({
      where: { tenantId, scheduledDate: { gte: startDate, lte: endDate }, status: { in: ['draft', 'approved'] } },
      _sum: { totalAmount: true },
    });

    const inflow = collections._sum.amount ?? 0;
    const outflow = payRuns._sum.totalAmount ?? 0;
    const net = inflow - outflow;

    const period = this.computePeriodLabel(horizon, startDate, endDate);
   const forecast = await this.prisma.cashForecast.create({
  data: { tenantId, period, horizon: horizon.toString(), startDate, endDate, inflow, outflow, net },
});


    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'cash_forecast_generated',
      details: { period, inflow, outflow, net },
    });

    if (net < 0) {
      await this.notifications.sendInApp(tenantId, `Cash deficit forecast ${period}: ${net}`, 'warning');
    }

    return forecast;
  }

  // ---- Payment Runs ----
  async createPaymentRun(
    tenantId: string,
    dto: {
      bankAccountId: string;
      scheduledDate: Date;
      currency: string;
      items: { vendorId?: string; billId?: string; amount: number; currency: string; reference?: string }[];
    },
  ) {
    const totalAmount = (dto.items ?? []).reduce((s, i) => s + i.amount, 0);

    const run = await this.prisma.paymentRun.create({
      data: {
        tenantId,
        bankAccountId: dto.bankAccountId,
        scheduledDate: dto.scheduledDate,
        status: 'draft',
        totalAmount,
        currency: dto.currency,
        items: { create: dto.items },
      },
      include: { items: true },
    });

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'payment_run_created',
      details: { id: run.id, totalAmount },
    });

    return run;
  }

  async approvePaymentRun(tenantId: string, runId: string, userId: string) {
    const run = await this.prisma.paymentRun.update({
      where: { id: runId },
      data: { status: 'approved' },
      include: { items: true, bankAccount: true },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || this.SYSTEM_USER_ID,
      action: 'payment_run_approved',
      details: { id: run.id },
    });

    return run;
  }

  async executePaymentRun(tenantId: string, runId: string, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const run = await tx.paymentRun.findFirst({
      where: { id: runId, tenantId },
      include: { items: true, bankAccount: true },
    });
    if (!run) throw new NotFoundException('Payment run not found');
    if (run.status !== 'approved') throw new BadRequestException('Run must be approved');

    await tx.journalEntry.create({
      data: {
        tenantId,
        date: new Date(),
        description: `Payment run executed (${run.id})`,
        lines: {
          create: [
            { accountId: await this.getAccountId(tenantId, '2101'), debit: run.totalAmount, credit: 0 },
            { accountId: await this.getAccountId(tenantId, '2000'), debit: 0, credit: run.totalAmount },
          ],
        },
      },
    });

    await tx.paymentRunItem.updateMany({
      where: { paymentRunId: run.id },
      data: { status: 'paid' },
    });

    const finalized = await tx.paymentRun.update({
      where: { id: run.id },
      data: { status: 'executed', executedAt: new Date() },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || this.SYSTEM_USER_ID,
      action: 'payment_run_executed',
      details: { id: run.id, totalAmount: run.totalAmount },
    });

    await this.notifications.sendInApp(tenantId, `Payment run executed: ${run.id}`, 'success');
    return finalized;
  });
}
  // ---- Collections ----
  async planCollection(
    tenantId: string,
    dto: { arInvoiceId?: string; customerId?: string; expectedOn: Date; amount: number; currency: string },
  ) {
    const plan = await this.prisma.collectionPlan.create({ data: { tenantId, ...dto } });

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'collection_planned',
      details: plan,
    });

    return plan;
  }

  async markCollectionReceived(tenantId: string, planId: string, receivedOn: Date) {
    const plan = await this.prisma.collectionPlan.update({
      where: { id: planId },
      data: { status: 'received', receivedOn },
    });

    // Ledger: AR ↓, Cash ↑
    await this.prisma.journalEntry.create({
      data: {
        tenantId,
        date: receivedOn,
        description: `Collection received (plan ${planId})`,
        lines: {
          create: [
            { accountId: await this.getAccountId(tenantId, '1100'), debit: 0, credit: plan.amount }, // AR
            { accountId: await this.getAccountId(tenantId, '2000'), debit: plan.amount, credit: 0 }, // Cash
          ],
        },
      },
    });

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'collection_received',
      details: { id: planId },
    });

    return plan;
  }
// ---- Forecast listing ----
async listForecasts(tenantId: string) {
  return this.prisma.cashForecast.findMany({
    where: { tenantId },
    orderBy: { startDate: 'desc' },
  });
}

// ---- Payment Runs listing ----
async listPaymentRuns(tenantId: string) {
  return this.prisma.paymentRun.findMany({
    where: { tenantId },
    include: { items: true, bankAccount: true },
    orderBy: { scheduledDate: 'desc' },
  });
}

async getPaymentRun(tenantId: string, runId: string) {
  const run = await this.prisma.paymentRun.findFirst({
    where: { tenantId, id: runId },
    include: { items: true, bankAccount: true },
  });
  if (!run) throw new NotFoundException('Payment run not found');
  return run;
}

// ---- Collections listing ----
async listCollections(tenantId: string) {
  return this.prisma.collectionPlan.findMany({
    where: { tenantId },
    orderBy: { expectedOn: 'desc' },
  });
}

// ---- Bank Statements listing ----
async listBankStatements(tenantId: string) {
  return this.prisma.bankStatement.findMany({
    where: { tenantId },
    include: { items: true },
    orderBy: { statementDate: 'desc' },
  });
}

  // ---- Bank Reconciliation ----
  async importBankStatement(tenantId: string, dto: {
    bankAccountId: string; statementDate: Date; raw: any;
    items: { date: string; description?: string; amount: number; currency: string }[];
  }) {
    const statement = await this.prisma.bankStatement.create({
      data: {
        tenantId,
        bankAccountId: dto.bankAccountId,
        statementDate: dto.statementDate,
        raw: dto.raw,
        items: {
          create: dto.items.map(i => ({
            date: new Date(i.date),
            description: i.description,
            amount: i.amount,
            currency: i.currency,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'bank_statement_imported',
      details: { id: statement.id, items: statement.items.length },
    });

    return statement;
  }

  async autoReconcile(tenantId: string, statementId: string) {
    const st = await this.prisma.bankStatement.findFirst({
      where: { id: statementId, tenantId },
      include: { items: true },
    });
    if (!st) throw new NotFoundException('Statement not found');

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        date: {
          gte: new Date(st.statementDate.getTime() - 1000 * 60 * 60 * 24 * 30),
          lte: new Date(st.statementDate.getTime() + 1000 * 60 * 60 * 24 * 30),
        },
      },
      include: { lines: true },
    });

    const bankAccId = await this.getAccountId(tenantId, '2000');
    const matches: Array<{ item: string; entry: string; amount: number }> = [];

    for (const item of st.items) {
      if (item.matched) continue;

      const candidate = entries.find(e =>
        e.lines.some(l =>
          l.accountId === bankAccId &&
          (Math.abs(l.debit - item.amount) < 0.01 || Math.abs(l.credit + item.amount) < 0.01),
        ),
      );

      if (candidate) {
        await this.prisma.bankStatementItem.update({
          where: { id: item.id },
          data: { matched: true, matchedEntryId: candidate.id },
        });
        matches.push({ item: item.id, entry: candidate.id, amount: item.amount });
      }
    }

    await this.audit.logAction({
      tenantId,
      userId: this.SYSTEM_USER_ID,
      action: 'bank_auto_reconciled',
      details: { statementId, matches: matches.length },
    });

    if (matches.length === 0) {
      await this.notifications.sendInApp(tenantId, `No bank matches found for statement ${statementId}`, 'warning');
    }
    return { matched: matches.length, details: matches };
  }

  // ---- Helpers ----
  private computePeriodLabel(h: ForecastHorizon, start: Date, end: Date) {
    if (h === 'weekly') return `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    if (h === 'monthly') return `${start.toISOString().slice(0, 7)}`;
    return `${start.toISOString().slice(0, 10)}`;
  }

  private async getAccountId(tenantId: string, code: string) {
    const acc = await this.prisma.account.findFirst({ where: { tenantId, code } });
    if (!acc) throw new BadRequestException(`Account ${code} missing`);
    return acc.id;
  }
}
