import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AccountingReportsService {
  constructor(private prisma: PrismaService) {}

  // Trial Balance for date range
  async getTrialBalance(tenantId: string, start: Date, end: Date) {
    // Pull all entries and lines in range
    const entries = await this.prisma.journalEntry.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      include: { lines: true },
    });

    // Aggregate by accountId
    const balances: Record<string, { accountId: string; debit: number; credit: number }> = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!balances[line.accountId]) {
          balances[line.accountId] = { accountId: line.accountId, debit: 0, credit: 0 };
        }
        balances[line.accountId].debit += Number(line.debit || 0);
        balances[line.accountId].credit += Number(line.credit || 0);
      }
    }

    // Map to accounts for code/name
    const accounts = await this.prisma.account.findMany({ where: { tenantId } });
    const rows = accounts.map((acc) => {
      const deb = balances[acc.id]?.debit || 0;
      const cred = balances[acc.id]?.credit || 0;
      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        debit: deb,
        credit: cred,
        balance: deb - cred,
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      rows,
      totals: { debit: totalDebit, credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
      period: { start, end },
    };
  }

  // Close Period
  async closePeriod(tenantId: string, dto: { period: string; startDate: Date; endDate: Date }) {
    // Prevent double-close
    const existing = await this.prisma.periodClose.findFirst({
      where: { tenantId, period: dto.period, status: 'closed' },
    });
    if (existing) throw new BadRequestException('Period already closed');

    // Lock the period
    await this.prisma.periodClose.create({
      data: {
        tenantId,
        period: dto.period,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: 'closed',
        closedAt: new Date(),
      },
    });

    // Compute P&L for that period via TB
    const tb = await this.getTrialBalance(tenantId, dto.startDate, dto.endDate);

    const incomeAccounts = tb.rows.filter((a) => a.code?.startsWith('4')); // revenue
    const expenseAccounts = tb.rows.filter((a) => a.code?.startsWith('5')); // expense

    const totalRevenue = incomeAccounts.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    // If netIncome != 0, create closing entry (P&L → Retained Earnings vs Income Summary)
    if (Math.abs(netIncome) > 0.0001) {
      const retainedEarningsId = await this.getRetainedEarnings(tenantId);
      const incomeSummaryId = await this.getIncomeSummary(tenantId);

      if (!retainedEarningsId || !incomeSummaryId) {
        // Not fatal to closing; but it won’t create the JE if missing system accounts
        throw new BadRequestException(
          'Missing Retained Earnings (3000) or Income Summary (3999) accounts for closing entry.',
        );
      }

      await this.prisma.journalEntry.create({
        data: {
          tenantId,
          date: dto.endDate,
          description: `Closing Entry for ${dto.period}`,
          status: 'posted',
          lines: {
            create: [
              {
                accountId: retainedEarningsId,
                debit: netIncome < 0 ? Math.abs(netIncome) : 0,
                credit: netIncome > 0 ? netIncome : 0,
              },
              {
                accountId: incomeSummaryId,
                debit: netIncome > 0 ? netIncome : 0,
                credit: netIncome < 0 ? Math.abs(netIncome) : 0,
              },
            ],
          },
        },
      });
    }

    return { status: 'closed', period: dto.period, netIncome };
  }

  private async getRetainedEarnings(tenantId: string) {
    return (await this.prisma.account.findFirst({ where: { tenantId, code: '3000' } }))?.id;
  }

  private async getIncomeSummary(tenantId: string) {
    return (await this.prisma.account.findFirst({ where: { tenantId, code: '3999' } }))?.id;
  }
}
