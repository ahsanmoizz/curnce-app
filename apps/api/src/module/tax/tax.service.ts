import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FileTaxReturnDto, RecordTaxPaymentDto } from './dto/tax.dto';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
@Injectable()
export class TaxService {
  private readonly SYSTEM_USER_ID = 'system-user-id'; // replace with actual system user if you track it

  constructor(private prisma: PrismaService,private audit: AuditService,  private accounting: AccountingService) {}

  // --- Public API ---

  async fileReturn(tenantId: string, dto: FileTaxReturnDto, userId: string)  {
    let amount = 0;

    if (dto.type === 'corporate') {
      const { start, end } = this.resolvePeriod(dto.period);
      const profit = await this.computeNetIncome(tenantId, start, end);
      amount = profit * 0.25;
    } else if (dto.type === 'gst') {
      const { start, end } = this.resolvePeriod(dto.period);
      const { outputTax, inputTax } = await this.computeGST(tenantId, start, end);
      amount = outputTax - inputTax;
    } else {
      throw new BadRequestException('Unknown tax type');
    }

    const ret = await this.prisma.taxReturn.create({
      data: { tenantId, type: dto.type, period: dto.period, amount, status: 'filed', filedAt: new Date() },
    });

    await this.audit.logAction({
  tenantId,
  userId, // ✅ real authenticated user
  action: 'tax_return_filed',
  details: { taxReturnId: ret.id, type: dto.type, period: dto.period, amount },
  ip: undefined,
});

    await this.safeNotify(tenantId, {
      type: 'tax_filed',
      severity: 'info',
      channel: 'email',
      title: `Tax filed: ${dto.type.toUpperCase()} ${dto.period}`,
      message: `Filed ${dto.type} for ${dto.period} with amount ${amount.toFixed(2)}.`,
    });

    return ret;
  }

  async recordPayment(tenantId: string, dto: RecordTaxPaymentDto, userId: string) {
    const ret = await this.prisma.taxReturn.findFirst({
      where: { id: dto.taxReturnId, tenantId },
    });
    if (!ret) throw new BadRequestException('Tax return not found');

    const payment = await this.prisma.taxPayment.create({
      data: { tenantId, taxReturnId: dto.taxReturnId, amount: dto.amount, paidDate: dto.paidDate, reference: dto.reference },
    });

    await this.prisma.taxReturn.update({
      where: { id: ret.id },
      data: { status: 'paid', paidAt: dto.paidDate },
    });

   
   await this.accounting.createJournalEntry(tenantId, {
  date: dto.paidDate,
  description: `Tax Payment for return ${dto.taxReturnId}`,
  lines: [
    // ✅ Debit Tax Liability (reduce liability)
    { accountId: await this.getTaxLiabilityAccount(tenantId), debit: dto.amount, credit: 0 },
    // ✅ Credit Cash/Bank (reduce asset)
    { accountId: await this.getCashAccount(tenantId), debit: 0, credit: dto.amount },
  ],
});
    await this.audit.logAction({
    tenantId,
    userId, // ✅ real authenticated user
    action: 'tax_payment_recorded',
    details: { taxReturnId: dto.taxReturnId, amount: dto.amount, paidDate: dto.paidDate, paymentId: payment.id },
    ip: undefined,
  });

    await this.safeNotify(tenantId, {
      type: 'tax_paid',
      severity: 'success',
      channel: 'email',
      title: `Tax paid for ${ret.type.toUpperCase()} ${ret.period}`,
      message: `Payment of ${dto.amount.toFixed(2)} recorded.`,
    });

    return payment;
  }

  async listReturns(tenantId: string) {
    return this.prisma.taxReturn.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { payments: true },
    });
  }

  // --- Helpers ---

  private resolvePeriod(period: string): { start: Date; end: Date } {
    const qm = period.match(/^(\d{4})-Q([1-4])$/i);
    if (qm) {
      const year = Number(qm[1]);
      const q = Number(qm[2]);
      const startMonth = (q - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
      return { start, end };
    }

    const mm = period.match(/^(\d{4})-(\d{2})$/);
    if (mm) {
      const year = Number(mm[1]);
      const month = Number(mm[2]) - 1;
      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      return { start, end };
    }

    throw new BadRequestException('Invalid period format. Use YYYY-MM or YYYY-Qn');
  }

  private async computeNetIncome(tenantId: string, start: Date, end: Date) {
    const rev = await this.prisma.journalEntryLine.aggregate({
      where: {
        entry: { tenantId, date: { gte: start, lte: end } }, // fixed relation name
        account: { code: { startsWith: '4' } },
      },
      _sum: { credit: true },
    });

    const exp5 = await this.prisma.journalEntryLine.aggregate({
      where: {
        entry: { tenantId, date: { gte: start, lte: end } }, // fixed
        account: { code: { startsWith: '5' } },
      },
      _sum: { debit: true },
    });

    const exp6 = await this.prisma.journalEntryLine.aggregate({
      where: {
        entry: { tenantId, date: { gte: start, lte: end } }, // fixed
        account: { code: { startsWith: '6' } },
      },
      _sum: { debit: true },
    });

    const revenue = Number(rev._sum?.credit ?? 0);
    const expenses = Number(exp5._sum?.debit ?? 0) + Number(exp6._sum?.debit ?? 0);
    return revenue - expenses;
  }

  private async computeGST(tenantId: string, start: Date, end: Date) {
    const sales = await this.prisma.journalEntryLine.aggregate({
      where: {
        entry: { tenantId, date: { gte: start, lte: end } }, // fixed
        account: { code: { startsWith: '4100' } },
      },
      _sum: { credit: true },
    });

    const purchases = await this.prisma.journalEntryLine.aggregate({
      where: {
        entry: { tenantId, date: { gte: start, lte: end } }, // fixed
        account: { code: { startsWith: '5100' } },
      },
      _sum: { debit: true },
    });

    const outputTax = Number(sales._sum?.credit ?? 0) * 0.18;
    const inputTax = Number(purchases._sum?.debit ?? 0) * 0.12;
    return { outputTax, inputTax };
  }
  private async getTaxLiabilityAccount(tenantId: string) {
  const account = await this.prisma.account.findFirst({
    where: {
      tenantId,
      type: 'LIABILITY',
      name: { contains: 'tax', mode: 'insensitive' }, // ✅ flexible: matches "Tax Payable", "GST Tax", etc.
    },
  });

  if (!account) {
    throw new BadRequestException(
      'Tax liability account not found. Please create one (e.g. "Tax Payable" under LIABILITIES).',
    );
  }

  return account.id;
}

private async getCashAccount(tenantId: string) {
  const account = await this.prisma.account.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { contains: 'Cash', mode: 'insensitive' } },
        { type: 'ASSET' }, // fallback if they only set type
      ],
    },
  });
  if (!account) {
    throw new BadRequestException(
      'Cash account not found. Please create one (e.g. "Cash" under ASSETS).',
    );
  }
  return account.id;
}
  private async safeNotify(
    tenantId: string,
    payload: { type: string; title: string; message: string; severity?: string; channel?: string },
  ) {
    try {
      await (this.prisma as any).notification?.create?.({
        data: {
          tenantId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          severity: (payload as any).severity ?? 'info',
          channel: (payload as any).channel ?? 'system',
        },
      });
    } catch {}
  }
}
