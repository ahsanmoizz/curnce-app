import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getTrialBalance(tenantId: string, from?: Date, to?: Date) {
    const entries = await this.prisma.entry.findMany({
      where: {
        tenantId,
        transaction: {
          tenantId,
          occurredAt: (from || to) ? {
            gte: from || undefined,
            lte: to || undefined,
          } : undefined,
        }
      },
      include: { account: true, transaction: true },
    });

    const byAccount = new Map<string, { accountCode: string; accountName: string; debit: number; credit: number }>();
    for (const e of entries) {
      const key = e.accountId;
      if (!byAccount.has(key)) {
        byAccount.set(key, {
          accountCode: e.account?.code || '',
          accountName: e.account?.name || '',
          debit: 0,
          credit: 0,
        });
      }
      const row = byAccount.get(key)!;
      row.debit += Number(e.debit || 0);
      row.credit += Number(e.credit || 0);
    }

    const rows = Array.from(byAccount.values());
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async getIncomeStatement(tenantId: string, from?: Date, to?: Date) {
    // Stub: Assume accounts with code starting '4' revenue, '5' expense
    const tb = await this.getTrialBalance(tenantId, from, to);
    const revenue = tb.rows.filter(r => r.accountCode.startsWith('4')).reduce((s, r) => s + (r.credit - r.debit), 0);
    const expenses = tb.rows.filter(r => r.accountCode.startsWith('5')).reduce((s, r) => s + (r.debit - r.credit), 0);
    const netIncome = revenue - expenses;
    return { revenue, expenses, netIncome, period: { from, to } };
  }

  async getBalanceSheet(tenantId: string, date?: Date) {
    // Stub: Use trial balance up to date
    const tb = await this.getTrialBalance(tenantId, undefined, date);
    const assets  = tb.rows.filter(r => r.accountCode.startsWith('1')).reduce((s, r) => s + (r.debit - r.credit), 0);
    const liabilities = tb.rows.filter(r => r.accountCode.startsWith('2')).reduce((s, r) => s + (r.credit - r.debit), 0);
    const equity = tb.rows.filter(r => r.accountCode.startsWith('3')).reduce((s, r) => s + (r.credit - r.debit), 0);
    const assetsEq = liabilities + equity;
    return { assets, liabilities, equity, balanced: Math.abs(assets - assetsEq) < 0.01, asOf: date };
  }
}
