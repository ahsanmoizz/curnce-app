import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';
import { Parser as Json2CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type BalanceGroup = { code: string; name: string; total: number };
type BalanceSheet = { asOf: Date; assets: BalanceGroup[]; liabilities: BalanceGroup[]; equity: BalanceGroup[] };
type IncomeStatement = { start: Date; end: Date; revenue: number; expense: number; netIncome: number };
type CashFlow = { start: Date; end: Date; inflows: number; outflows: number; net: number };
type Format = 'csv' | 'xlsx' | 'pdf' | 'json';

interface ReportResultBuffer {
  filename: string;
  mime: string;
  buffer: Buffer;
}
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ---------- Trial Balance ----------
  async getTrialBalance(tenantId: string, start: Date, end: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      include: { lines: true },
    });

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

  // ---------- Close Period ----------
  async closePeriod(tenantId: string, dto: { period: string; startDate: Date; endDate: Date }) {
    const existing = await this.prisma.periodClose.findFirst({
      where: { tenantId, period: dto.period, status: 'closed' },
    });
    if (existing) throw new BadRequestException('Period already closed');

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

    const tb = await this.getTrialBalance(tenantId, dto.startDate, dto.endDate);

    const incomeAccounts = tb.rows.filter((a) => a.code?.startsWith('4'));
    const expenseAccounts = tb.rows.filter((a) => a.code?.startsWith('5'));

    const totalRevenue = incomeAccounts.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    if (Math.abs(netIncome) > 0.0001) {
      const retainedEarningsId = await this.getRetainedEarnings(tenantId);
      const incomeSummaryId = await this.getIncomeSummary(tenantId);

      if (!retainedEarningsId || !incomeSummaryId) {
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
  // ---------- Ledger Report (Export) ----------
  async generateLedgerReport(tenantId: string, format: Format): Promise<ReportResultBuffer | any> {
    const txs = await this.prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      include: { entries: true },
      take: 5000,
    });

    const rows = txs.flatMap((t) =>
      t.entries.map((e) => ({
        transactionId: t.id,
        occurredAt: t.occurredAt,
        description: t.description,
        source: t.source,
        entryId: e.id,
        accountId: e.accountId,
        debit: e.debit,
        credit: e.credit,
        currency: e.currency,
      })),
    );

    const columns = [
      'transactionId',
      'occurredAt',
      'description',
      'source',
      'entryId',
      'accountId',
      'debit',
      'credit',
      'currency',
    ];

    return this.buildReport('ledger', tenantId, format, rows, columns);
  }

  // ---------- Payments Report (Export) ----------
  async generatePaymentsReport(tenantId: string, format: Format): Promise<ReportResultBuffer | any> {
  const items = await this.prisma.paymentIntent.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const rows = items.map((p) => ({
    id: p.id,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    customerId: p.customerId ?? '',
    payeeId: p.payeeId ?? '',
    createdAt: p.createdAt,
    releasedAt: null,   // PaymentIntent doesn’t have this, but keep for report format
    refundedAt: null,   // same here
    refId: p.paymentId ?? '',
  }));

  const columns = [
    'id',
    'status',
    'amount',
    'currency',
    'customerId',
    'payeeId',
    'createdAt',
    'releasedAt',
    'refundedAt',
    'refId',
  ];

  return this.buildReport('payments', tenantId, format, rows, columns);
}
  // ---------- Compliance Notifications Report (Export) ----------
  async generateComplianceNotificationsReport(tenantId: string, format: Format): Promise<ReportResultBuffer | any> {
    const notifs = await this.prisma.notification.findMany({
      where: { tenantId, type: 'compliance' },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows = notifs.map((n) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      title: n.title,
      message: n.message,
      channel: n.channel,
      read: n.read,
      createdAt: n.createdAt,
      userId: n.userId ?? '',
    }));

    const columns = ['id', 'type', 'severity', 'title', 'message', 'channel', 'read', 'createdAt', 'userId'];

    return this.buildReport('compliance', tenantId, format, rows, columns);
  }

  // ---------- Build Report (CSV, XLSX, PDF, JSON) ----------
  private async buildReport(
    reportType: string,
    tenantId: string,
    format: Format,
    rows: any[],
    columns: string[],
  ): Promise<ReportResultBuffer | any> {
    if (format === 'json') {
      await this.safeAudit({
        tenantId,
        action: 'REPORT_PREVIEW',
        details: { reportType, count: rows.length },
      });
      return { preview: rows.slice(0, 10), total: rows.length };
    }

    const dir = path.join('/tmp', 'reports', tenantId);
    await fs.promises.mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filenameBase = `${reportType}-${timestamp}`;

    if (format === 'csv') {
      const parser = new Json2CsvParser({ fields: columns });
      const csv = parser.parse(rows);
      const filename = `${filenameBase}.csv`;
      const fullpath = path.join(dir, filename);
      await fs.promises.writeFile(fullpath, csv, 'utf8');
      await this.safeAudit({
        tenantId,
        action: 'REPORT_GENERATED',
        details: { reportType, format: 'csv', rows: rows.length },
      });
      return { filename, mime: 'text/csv', buffer: Buffer.from(csv, 'utf8') };
    }

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('Report');
      sheet.columns = columns.map((c) => ({ header: c, key: c }));
      rows.forEach((r) => sheet.addRow(r));
      const filename = `${filenameBase}.xlsx`;
      const fullpath = path.join(dir, filename);
      await wb.xlsx.writeFile(fullpath);
      await this.safeAudit({
        tenantId,
        action: 'REPORT_GENERATED',
        details: { reportType, format: 'xlsx', rows: rows.length },
      });
      const buffer = await wb.xlsx.writeBuffer();
      return {
        filename,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(buffer),
      };
    }

    if (format === 'pdf') {
      const filename = `${filenameBase}.pdf`;
      const fullpath = path.join(dir, filename);
      const doc = new PDFDocument({ margin: 36 });
      const stream = fs.createWriteStream(fullpath);
      doc.pipe(stream);

      doc.fontSize(16).text(`${reportType.toUpperCase()} REPORT`, { underline: true });
      doc.moveDown();

      const maxRows = Math.min(rows.length, 500);
      doc.fontSize(10);
      doc.text(columns.join(' | '));
      doc.moveDown(0.5);

      for (let i = 0; i < maxRows; i++) {
        const row = columns.map((c) => this.stringify(rows[i][c])).join(' | ');
        doc.text(row);
      }

      doc.end();
      await new Promise<void>((resolve) => {
        stream.on('finish', () => resolve());
        stream.on('close', () => resolve());
      });

      await this.safeAudit({
        tenantId,
        action: 'REPORT_GENERATED',
        details: { reportType, format: 'pdf', rows: rows.length },
      });

      const buffer = await fs.promises.readFile(fullpath);
      return { filename, mime: 'application/pdf', buffer };
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  private stringify(v: any) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  private async safeAudit(payload: any) {
    try {
      await this.audit.logAction(payload);
    } catch {
      try {
        await (this.audit as any).log?.(payload.action || 'REPORT', payload.details || {});
      } catch (e) {
        this.logger.warn('Audit fallback failed');
      }
    }
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
