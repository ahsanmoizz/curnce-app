// apps/api/src/module/ledger/ledger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // ✅ create unified ledger entry
  async createEntry(dto: {
  tenantId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  accountId: string;
  currency: string;
  description?: string;
  referenceId?: string;
  transactionId?: string; // ✅ allow linking to an existing transaction
}) {
  let transactionId = dto.transactionId;

  // If no transactionId provided → create new transaction (system flows only)
  if (!transactionId) {
    const newTx = await this.prisma.transaction.create({
      data: {
        tenantId: dto.tenantId,
        description: dto.description || '',
        source: 'system',
        externalId: dto.referenceId || null,
        occurredAt: new Date(),
        amount: new Decimal(dto.amount),
        currency: dto.currency || 'INR',
      },
    });
    transactionId = newTx.id;
  }

  // Always create entry
  await this.prisma.entry.create({
    data: {
      tenantId: dto.tenantId,
      transactionId,
      accountId: dto.accountId,
      debit: dto.type === 'DEBIT' ? new Decimal(dto.amount) : new Decimal(0),
      credit: dto.type === 'CREDIT' ? new Decimal(dto.amount) : new Decimal(0),
      currency: dto.currency,
    },
  });

  // ✅ Large transaction notification + audit log
  const threshold = Number(process.env.LARGE_TX_THRESHOLD || 10000);
  if (dto.amount >= threshold) {
    try {
      await this.notifications.sendNotification(dto.tenantId, 'large_tx_detected', {
        txId: transactionId,
        amount: dto.amount,
        currency: dto.currency,
        type: dto.type,
      });
    } catch (err) {
      this.logger.warn('notification send failed for large_tx_detected', err);
    }

    await this.audit.logAction({
      tenantId: dto.tenantId,
      userId: 'system',
      action: 'LARGE_TX',
      details: { txId: transactionId, amount: dto.amount, currency: dto.currency },
    });
  }

  return this.prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { entries: true },
  });
}
  // ✅ specific wrappers
  async recordPaymentRelease(dto: { tenantId: string; paymentId: string; amount: number; currency: string; accountId: string }) {
    return this.createEntry({
      tenantId: dto.tenantId,
      type: 'CREDIT',
      amount: dto.amount,
      accountId: dto.accountId,
      currency: dto.currency,
      description: `Payment Release ${dto.paymentId}`,
      referenceId: dto.paymentId,
    });
  }

  async recordPaymentRefund(dto: { tenantId: string; paymentId: string; amount: number; currency: string; accountId: string }) {
    return this.createEntry({
      tenantId: dto.tenantId,
      type: 'DEBIT',
      amount: dto.amount,
      accountId: dto.accountId,
      currency: dto.currency,
      description: `Payment Refund ${dto.paymentId}`,
      referenceId: dto.paymentId,
    });
  }

  async addFundTransferEntry(transferId: string, tenantId: string, amount: number, currency: string, status: string, accountId: string) {
    return this.createEntry({
      tenantId,
      type: 'DEBIT',
      amount,
      accountId,
      currency,
      description: `Fund Transfer ${transferId} (${status})`,
      referenceId: transferId,
    });
  }

  async addRefundEntry(refundId: string, tenantId: string, amount: number, currency: string, accountId: string) {
    return this.createEntry({
      tenantId,
      type: 'DEBIT',
      amount,
      accountId,
      currency,
      description: `Refund ${refundId}`,
      referenceId: refundId,
    });
  }

  async holdDisputeFunds(disputeId: string, tenantId: string, amount: number, currency: string, accountId: string) {
    return this.createEntry({
      tenantId,
      type: 'DEBIT',
      amount,
      accountId,
      currency,
      description: `Dispute Hold ${disputeId}`,
      referenceId: disputeId,
    });
  }

  // ✅ list all entries
  async listEntries(tenantId: string, opts?: { type?: 'CREDIT' | 'DEBIT' }) {
    return this.prisma.entry.findMany({
      where: {
        tenantId,
        ...(opts?.type === 'CREDIT'
          ? { credit: { gt: 0 } }
          : opts?.type === 'DEBIT'
          ? { debit: { gt: 0 } }
          : {}),
      },
      include: { transaction: true, account: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
