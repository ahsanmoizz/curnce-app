import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';

type BalanceGroup = { code: string; name: string; total: number };
type BalanceSheet = { asOf: Date; assets: BalanceGroup[]; liabilities: BalanceGroup[]; equity: BalanceGroup[] };
type IncomeStatement = { start: Date; end: Date; revenue: number; expense: number; netIncome: number };
type CashFlow = { start: Date; end: Date; inflows: number; outflows: number; net: number };

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ---------- Balance Sheet ----------
  async balanceSheet(tenantId: string, asOf: Date): Promise<BalanceSheet> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true, type: true },
    });

    const byAccount = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: { account: { tenantId }, entry: { tenantId, date: { lte: asOf } } },
      _sum: { debit: true, credit: true },
    });

    const totals = new Map<string, number>();
    for (const g of byAccount) {
      const total = Number(g._sum?.debit ?? 0) - Number(g._sum?.credit ?? 0);
      totals.set(g.accountId, total);
    }

    const assets: BalanceGroup[] = [];
    const liabilities: BalanceGroup[] = [];
    const equity: BalanceGroup[] = [];

    for (const a of accounts) {
      const total = totals.get(a.id) ?? 0;
      if (a.type === 'ASSET') assets.push({ code: a.code, name: a.name, total });
      if (a.type === 'LIABILITY') liabilities.push({ code: a.code, name: a.name, total });
      if (a.type === 'EQUITY') equity.push({ code: a.code, name: a.name, total });
    }

    const report: BalanceSheet = { asOf, assets, liabilities, equity };

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'report_generated',
      details: { type: 'balance_sheet', asOf },
    });

    return report;
  }

  // ---------- Income Statement ----------
  async incomeStatement(tenantId: string, start: Date, end: Date): Promise<IncomeStatement> {
    const revenueAgg = await this.prisma.journalEntryLine.aggregate({
      where: { account: { tenantId, type: 'INCOME' }, entry: { tenantId, date: { gte: start, lte: end } } },
      _sum: { credit: true, debit: true },
    });

    const expenseAgg = await this.prisma.journalEntryLine.aggregate({
      where: { account: { tenantId, type: 'EXPENSE' }, entry: { tenantId, date: { gte: start, lte: end } } },
      _sum: { credit: true, debit: true },
    });

    const revenue = Number(revenueAgg._sum?.credit ?? 0) - Number(revenueAgg._sum?.debit ?? 0);
    const expense = Number(expenseAgg._sum?.debit ?? 0) - Number(expenseAgg._sum?.credit ?? 0);
    const netIncome = revenue - expense;

    const report: IncomeStatement = { start, end, revenue, expense, netIncome };

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'report_generated',
      details: { type: 'income_statement', start, end },
    });

    return report;
  }

  // ---------- Cash Flow ----------
  async cashFlow(tenantId: string, start: Date, end: Date): Promise<CashFlow> {
    const cashAccounts = await this.prisma.account.findMany({
      where: { tenantId, code: { startsWith: '2000' } },
      select: { id: true },
    });

    if (cashAccounts.length === 0) {
      throw new BadRequestException('No cash/bank accounts found (expected code starting with 2000).');
    }
    const cashIds = cashAccounts.map(a => a.id);

    const inflowAgg = await this.prisma.journalEntryLine.aggregate({
      where: { accountId: { in: cashIds }, entry: { tenantId, date: { gte: start, lte: end } } },
      _sum: { debit: true },
    });

    const outflowAgg = await this.prisma.journalEntryLine.aggregate({
      where: { accountId: { in: cashIds }, entry: { tenantId, date: { gte: start, lte: end } } },
      _sum: { credit: true },
    });

    const inflows = Number(inflowAgg._sum?.debit ?? 0);
    const outflows = Number(outflowAgg._sum?.credit ?? 0);
    const report: CashFlow = { start, end, inflows, outflows, net: inflows - outflows };

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'report_generated',
      details: { type: 'cash_flow', start, end },
    });

    return report;
  }

  // ---------- Budget vs Actual ----------
  async budgetVariance(tenantId: string, year: number, period: string) {
    const periodStart = this.parsePeriodStart(year, period);
    const periodEnd = this.endOfMonth(periodStart);

    const budgets = await this.prisma.budget.findMany({
      where: { tenantId, year, period },
      include: { account: true },
    });

    const result: any[] = [];
    for (const b of budgets) {
      const sum = await this.prisma.journalEntryLine.aggregate({
        where: { accountId: b.accountId, entry: { tenantId, date: { gte: periodStart, lte: periodEnd } } },
        _sum: { debit: true, credit: true },
      });

      const actual = Number(sum._sum?.debit ?? 0) - Number(sum._sum?.credit ?? 0);
      result.push({
        account: b.account.code,
        accountName: b.account.name,
        budget: b.amount,
        actual,
        variance: actual - b.amount,
      });
    }

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'report_generated',
      details: { type: 'budget_variance', year, period },
    });

    return result;
  }

  // ---------- File Export ----------
  async exportToPDF(reportData: any): Promise<string> {
    const safeId = `report-${Date.now()}.json`;
    return `https://files.local/reports/${safeId}`;
  }

  async exportToExcel(reportData: any): Promise<string> {
    const safeId = `report-${Date.now()}.xlsx`;
    return `https://files.local/reports/${safeId}`;
  }

  async recordExport(
    tenantId: string,
    params: { type: 'pdf' | 'excel' | 'csv'; name: string; url: string },
  ) {
    const rec = await this.prisma.reportExport.create({
      data: { tenantId, type: params.type, name: params.name, url: params.url },
    });

    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'report_export_recorded',
      details: { id: rec.id, type: rec.type, name: rec.name },
    });

    return rec;
  }

  // ---------- Legacy Controller Compatibility ----------
  async generateFinancialReport(
    tenantId: string,
    type: 'P&L' | 'BalanceSheet' | 'Cashflow',
    period: string,
  ) {
    if (!period) throw new BadRequestException('period required');
    const now = new Date();
    const { from, to } = this.resolvePeriod(period, now);

    let reportData: any;
    if (type === 'BalanceSheet') {
      reportData = await this.balanceSheet(tenantId, to);
    } else if (type === 'P&L') {
      reportData = await this.incomeStatement(tenantId, from, to);
    } else if (type === 'Cashflow') {
      reportData = await this.cashFlow(tenantId, from, to);
    } else {
      throw new BadRequestException(`unsupported report type: ${type}`);
    }

    const fileUrl = await this.exportToPDF(reportData);

    return this.prisma.report.create({
      data: { tenantId, type, period, fileUrl },
    });
  }

  async getReport(id: string, tenantId: string) {
    const r = await this.prisma.report.findFirst({ where: { id, tenantId } });
    if (!r) throw new BadRequestException('report not found');
    return r;
  }

  async generateComplianceReport(tenantId: string, period: string) {
    if (!period) throw new BadRequestException('period required');
    const report = await this.prisma.complianceReport.findFirst({
      where: { tenantId, period },
      orderBy: { createdAt: 'desc' },
    });
    if (!report) throw new BadRequestException('no compliance report exists for period');

    const fileUrl = await this.exportToPDF(report.data);
    return this.recordExport(tenantId, {
      type: 'pdf',
      name: `Compliance-${period}`,
      url: fileUrl,
    });
  }

  // ---------- Helpers ----------
  private resolvePeriod(period: string, now: Date) {
    if (/^\d{4}-Q[1-4]$/.test(period)) {
      const [y, qRaw] = period.split('-Q');
      const q = parseInt(qRaw, 10);
      const startMonth = (q - 1) * 3;
      const from = new Date(Date.UTC(parseInt(y, 10), startMonth, 1));
      const to = new Date(Date.UTC(parseInt(y, 10), startMonth + 3, 0, 23, 59, 59));
      return { from, to };
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, mStr] = period.split('-');
      const m = parseInt(mStr, 10);
      const from = new Date(Date.UTC(parseInt(y, 10), m - 1, 1));
      const to = new Date(Date.UTC(parseInt(y, 10), m, 0, 23, 59, 59));
      return { from, to };
    }
    if (period === 'last30d') {
      const to = now;
      const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
      return { from, to };
    }
    throw new BadRequestException('unsupported period format');
  }

  private parsePeriodStart(year: number, period: string): Date {
    const m = period.match(/^(\d{4})-(\d{2})$/);
    if (!m) throw new BadRequestException('period must be "YYYY-MM".');
    const y = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    return new Date(Date.UTC(y, mon, 1, 0, 0, 0));
  }

  private endOfMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
  }
}
