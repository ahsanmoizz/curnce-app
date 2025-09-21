import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AuditService } from '../audit/audit.service';   // ✅ IMPORT
import { CreateCustomerDto, CreateInvoiceDto, RecordInvoicePaymentDto } from './dto/ar.dto';

@Injectable()
export class AccountsReceivableService {
  private readonly SYSTEM_USER_ID = 'system-user-id'; // replace if you have real user context

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private audit: AuditService,   // ✅ INJECT
  ) {}

  async createCustomer(tenantId: string, dto: CreateCustomerDto, ipAddress?: string, userId?: string) {
    const customer = await this.prisma.customer.create({
      data: { tenantId, ...dto, email: dto.email ?? '' },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId ?? this.SYSTEM_USER_ID,
      action: 'customer_created',
      details: { entity: 'Customer', entityId: customer.id },
      ip: ipAddress,
    });

    return customer;
  }

  async createInvoice(tenantId: string, dto: CreateInvoiceDto, ipAddress?: string, userId?: string) {
    const invoice = await this.prisma.invoice.create({
      data: { tenantId, ...dto, status: 'unpaid' },
    });

    // Journal entry OUTSIDE create
    await this.accounting.createJournalEntry(tenantId, {
      date: new Date(),
      description: `Invoice Created: ${dto.invoiceNo}`,
      lines: [
        { accountId: await this.getARAccount(tenantId), debit: dto.amount, credit: 0 },
        { accountId: await this.getRevenueAccount(tenantId), debit: 0, credit: dto.amount },
      ],
    });

    // Audit log OUTSIDE create
    await this.audit.logAction({
      tenantId,
      userId: userId ?? this.SYSTEM_USER_ID,
      action: 'invoice_created',
      details: { entity: 'Invoice', entityId: invoice.id, invoiceNo: invoice.invoiceNo },
      ip: ipAddress,
    });

    return invoice;
  }

  async recordPayment(tenantId: string, dto: RecordInvoicePaymentDto, ipAddress?: string, userId?: string) {
    // Step 1: Run main payment + invoice update inside transaction
    const { payment, invoice } = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: dto.invoiceId, tenantId } });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const payment = await tx.invoicePayment.create({
        data: { tenantId, ...dto },
      });

      const paidAgg = await tx.invoicePayment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });
      const totalPaid = paidAgg._sum.amount ?? 0;
      const status = totalPaid >= invoice.amount ? 'paid' : 'partial';

      await tx.invoice.update({ where: { id: invoice.id }, data: { status } });

      return { payment, invoice };
    });

    // Step 2: Journal entry OUTSIDE transaction
    await this.accounting.createJournalEntry(tenantId, {
      date: dto.paidDate,
      description: `Invoice Payment: ${invoice.invoiceNo}`,
      lines: [
        { accountId: await this.getCashAccount(tenantId), debit: dto.amount, credit: 0 },
        { accountId: await this.getARAccount(tenantId), debit: 0, credit: dto.amount },
      ],
    });

    // Step 3: Audit log OUTSIDE transaction
    await this.audit.logAction({
      tenantId,
      userId: userId ?? this.SYSTEM_USER_ID,
      action: 'invoice_paid',
      details: { entity: 'InvoicePayment', entityId: payment.id, invoiceId: invoice.id },
      ip: ipAddress,
    });

    return payment;
  }

  // ---- Helpers ----
  private async getARAccount(tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        tenantId,
        name: { equals: 'Accounts Receivable', mode: 'insensitive' },
      },
    });
    if (!account) {
      throw new BadRequestException('Accounts Receivable account not found. Please create it first.');
    }
    return account.id;
  }

  private async getRevenueAccount(tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        tenantId,
        type: 'INCOME',
      },
    });
    if (!account) {
      throw new BadRequestException('Revenue account not found. Please create one.');
    }
    return account.id;
  }

  private async getCashAccount(tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        tenantId,
        OR: [
          { name: { contains: 'Cash', mode: 'insensitive' } },
          { type: 'ASSET' },
        ],
      },
    });
    if (!account) {
      throw new BadRequestException('Cash account not found. Please create one.');
    }
    return account.id;
  }
}
