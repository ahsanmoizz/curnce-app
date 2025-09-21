import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateBillDto, CreateVendorDto, RecordBillPaymentDto } from './dto/ap.dto';
import { AccountingService } from '../accounting/accounting.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AccountsPayableService {
  private readonly SYSTEM_USER_ID = 'system-user-id'; // replace with real userId if available

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private audit: AuditService,
  ) {}

  async createVendor(
    tenantId: string,
    dto: CreateVendorDto,
    ipAddress?: string,
    userId?: string,
  ) {
    const vendor = await this.prisma.vendor.create({ data: { tenantId, ...dto } });

    await this.audit.logAction({
      tenantId,
      userId: userId ?? this.SYSTEM_USER_ID,
      action: 'vendor_created',
      details: { entity: 'Vendor', entityId: vendor.id },
      ip: ipAddress,
    });

    return vendor;
  }

  async createBill(
    tenantId: string,
    dto: CreateBillDto,
    ipAddress?: string,
    userId?: string,
  ) {
    // Prevent duplicate invoice number for same tenant
    const existing = await this.prisma.bill.findFirst({
      where: { tenantId, invoiceNo: dto.invoiceNo },
    });
    if (existing) {
      throw new BadRequestException(
        `Invoice number ${dto.invoiceNo} already exists`,
      );
    }

    const bill = await this.prisma.bill.create({
      data: { tenantId, ...dto, status: 'unpaid' },
    });

    // Journal entry
   await this.accounting.createJournalEntry(tenantId, {
  date: new Date(),
  description: `Bill Created: ${dto.invoiceNo}`,
  lines: [
    {
      // ✅ Debit expense (or asset if needed)
      accountId: await this.getExpenseAccount(tenantId),
      debit: dto.amount,
      credit: 0,
    },
    {
      // ✅ Credit Accounts Payable
      accountId: await this.getAPAccount(tenantId),
      debit: 0,
      credit: dto.amount,
    },
  ],
});

    await this.audit.logAction({
      tenantId,
      userId: userId ?? this.SYSTEM_USER_ID,
      action: 'bill_created',
      details: {
        entity: 'Bill',
        entityId: bill.id,
        invoiceNo: bill.invoiceNo,
      },
      ip: ipAddress,
    });

    return bill;
  }
async recordPayment(
  tenantId: string,
  dto: RecordBillPaymentDto,
  ipAddress?: string,
  userId?: string,
) {
  // Step 1: Run payment + bill update inside transaction
  const { payment, bill } = await this.prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findFirst({
      where: { id: dto.billId, tenantId },
    });
    if (!bill) throw new NotFoundException('Bill not found');

    // Aggregate existing payments
    const paidSoFar = await tx.billPayment.aggregate({
      where: { billId: bill.id },
      _sum: { amount: true },
    });
    const totalPaid = paidSoFar._sum.amount ?? 0;
    if (totalPaid + dto.amount > bill.amount) {
      throw new BadRequestException('Payment exceeds remaining bill balance');
    }

    // Create payment
    const payment = await tx.billPayment.create({
      data: { tenantId, ...dto },
    });

    // Update bill status
    const newTotalPaid = totalPaid + dto.amount;
    const status = newTotalPaid >= bill.amount ? 'paid' : 'partial';
    await tx.bill.update({
      where: { id: bill.id },
      data: { status },
    });

    return { payment, bill };
  });

  // Step 2: Journal entry OUTSIDE transaction
  await this.accounting.createJournalEntry(tenantId, {
  date: typeof dto.paidDate === 'string' ? new Date(dto.paidDate) : dto.paidDate,
  description: `Bill Payment: ${bill.invoiceNo}`,
  lines: [
    {
      // ✅ Debit Accounts Payable (reduce liability)
      accountId: await this.getAPAccount(tenantId),
      debit: dto.amount,
      credit: 0,
    },
    {
      // ✅ Credit Cash/Bank (reduce asset)
      accountId: await this.getCashAccount(tenantId),
      debit: 0,
      credit: dto.amount,
    },
  ],
});

  // Step 3: Audit log OUTSIDE transaction
  await this.audit.logAction({
    tenantId,
    userId: userId ?? this.SYSTEM_USER_ID,
    action: 'bill_paid',
    details: { entity: 'BillPayment', entityId: payment.id, billId: bill.id },
    ip: ipAddress,
  });

  return payment;
}


  // ---- Helpers ----
  private async getExpenseAccount(tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: { tenantId, type: 'EXPENSE' }, // any expense account
    });
    if (!account) {
      throw new BadRequestException(
        'No Expense account found. Please create one.',
      );
    }
    return account.id;
  }

  private async getAPAccount(tenantId: string) {
  const account = await this.prisma.account.findFirst({
    where: {
      tenantId,
      type: 'LIABILITY',
      name: { contains: 'payable', mode: 'insensitive' }, // 👈 PATCH
    },
  });
  if (!account) {
    throw new BadRequestException(
      'Accounts Payable account not found. Please create it first.',
    );
  }
  return account.id;
}
private async getCashAccount(tenantId: string) {
  const account = await this.prisma.account.findFirst({
    where: {
      tenantId,
      type: 'ASSET',
      OR: [
        { name: { contains: 'cash', mode: 'insensitive' } },
        { name: { contains: 'bank', mode: 'insensitive' } },
      ],
    },
  });
  if (!account) {
    throw new BadRequestException(
      'Cash/Bank account not found. Please create one first.',
    );
  }
  return account.id;
}
}
