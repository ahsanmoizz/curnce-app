import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * RefundsService
 * - preserves existing requestRefund / approveRefund logic
 * - adds audit trail (awaited)
 * - fires notifications (non-blocking)
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly blockchain: BlockchainService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}
async requestRefund(tenantId: string, body: any, requestorId: string) {
  const { customerId, originalTransactionId, amount, currency, reason, destination } = body;
  if (!customerId || !originalTransactionId || !amount || !currency) {
    throw new BadRequestException('customerId, originalTransactionId, amount, currency required');
  }

  // 🔹 Prevent duplicate active refunds
  const existing = await this.prisma.refund.findFirst({
    where: {
      tenantId,
      originalTransactionId,
      status: { in: ['requested', 'approved', 'released'] },
    },
  });
  if (existing) return existing;

  const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) throw new NotFoundException('customer not found');

  if (customer.status === 'blocked' && destination && destination !== 'original') {
    throw new ForbiddenException('blocked customer: refund must go to original source');
  }

  const tx = await this.prisma.transaction.findFirst({ where: { id: originalTransactionId, tenantId } });
  if (!tx) throw new NotFoundException('original transaction not found');

  const refund = await this.prisma.refund.create({
    data: {
      tenantId,
      customerId,
      originalTransactionId,
      amount: new Decimal(Number(amount).toFixed(2)),
      currency,
      reason: reason || null,
      destination: destination || 'original',
      status: 'requested',
    },
  });

  // Audit
  await this.audit.logAction({
    tenantId,
    userId: requestorId || 'system',
    action: 'REFUND_REQUESTED',
    details: { refundId: refund.id, originalTransactionId, amount: Number(amount), currency, reason },
  });

  // Notify (async)
  (async () => {
    try {
      await this.notifications.sendNotification(tenantId, 'refund_requested', {
        refundId: refund.id,
        customerId,
        amount: Number(amount),
        currency,
      });
    } catch (err) {
      this.logger.warn('notification send failed for refund_requested', err);
    }
  })();

  return refund;
}
async releaseRefund(tenantId: string, refundId: string, actorUserId: string) {
  const refund = await this.prisma.refund.findFirst({
    where: { id: refundId, tenantId },
  });
  if (!refund) throw new NotFoundException('refund not found');
  if (refund.status !== 'approved') {
    throw new BadRequestException('refund must be approved prior to release');
  }

  let txHash: string | null = null;

  if (process.env.USE_BLOCKCHAIN_REFUNDS === 'true') {
    try {
      if (refund.destination && refund.destination.startsWith('wallet:')) {
        const address = refund.destination.split(':')[1];
        const resp = await this.blockchain.sendFunds(
          process.env.TENANT_ESCROW_ADDRESS || '', // escrow placeholder
          address,
          String(refund.amount),
          refund.currency,
          { idempotencyKey: refund.id },
        );
        txHash = resp.txHash;
      }
    } catch (err) {
      await this.prisma.refund.update({ where: { id: refund.id }, data: { status: 'failed' } });
      this.logger.error('blockchain send failed during refund release', err);
      throw err;
    }
  }

  const updated = await this.prisma.refund.update({
    where: { id: refund.id },
    data: { status: 'released', blockchainTxHash: txHash || null },
  });

  await this.audit.logAction({
    tenantId,
    userId: actorUserId || 'system',
    action: 'REFUND_RELEASED',
    details: { refundId: updated.id, blockchainTxHash: txHash },
  });

  (async () => {
    try {
      await this.notifications.sendNotification(tenantId, 'refund_released', {
        refundId: updated.id,
        amount: Number(refund.amount),
        currency: refund.currency,
        txHash,
      });
    } catch (err) {
      this.logger.warn('notification send failed for refund_released', err);
    }
  })();

  return updated;
}
async listRefunds(tenantId: string) {
  return this.prisma.refund.findMany({
    where: { tenantId },
    include: { customer: true, original: true },
    orderBy: { createdAt: 'desc' },
  });
}

  /**
   * approveRefund: creates reversal transaction, marks refund approved,
   * writes audit record, ledger entry and (optionally) triggers blockchain payout.
   */
  async approveRefund(tenantId: string, refundId: string, approverUserId: string) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, tenantId },
      include: { original: { include: { entries: true } }, customer: true },
    });
    if (!refund) throw new NotFoundException('refund not found');

    if (refund.status !== 'requested') {
      throw new BadRequestException(`refund not in requested state (current=${refund.status})`);
    }

    // Build reversal entries and create reversal transaction in a transaction
    const originalEntries = refund.original.entries;
    const reversalEntries = originalEntries.map(e => ({
      tenantId,
      accountId: e.accountId,
      debit: e.credit,
      credit: e.debit,
      currency: e.currency,
    }));

    const originalNet = originalEntries.reduce((sum, e) => sum + Number(e.credit) - Number(e.debit), 0);
    const requested = Number(refund.amount);
    const factor = originalNet !== 0 ? Math.min(Math.abs(requested / Math.abs(originalNet)), 1) : 1;

    const scaledReversal = reversalEntries.map(e => ({
      ...e,
      debit: new Decimal((Number((e as any).debit) * factor).toFixed(2)),
      credit: new Decimal((Number((e as any).credit) * factor).toFixed(2)),
    }));

    const reversalTx = await this.prisma.$transaction(async (tx) => {
     const t = await tx.transaction.create({
  data: {
    tenantId,
    description: `REFUND for ${refund.originalTransactionId} (${refund.id})`,
    source: 'refund',
    occurredAt: new Date(),
    amount: new Decimal(refund.amount),                 // ✅ required
    currency: refund.currency || 'USD',                 // ✅ required
  },
});


      await tx.entry.createMany({
        data: scaledReversal.map((e: any) => ({ ...e, transactionId: t.id })),
      });

      await tx.refund.update({
        where: { id: refund.id },
        data: { status: 'approved', approvedByUserId: approverUserId },
      });

      return t;
    });

    // AUDIT: REFUND_APPROVED (awaited)
    await this.audit.logAction({
      tenantId,
      userId: approverUserId,
      action: 'REFUND_APPROVED',
      details: {
        refundId: refund.id,
        originalTransactionId: refund.originalTransactionId,
        amount: Number(refund.amount),
        currency: refund.currency,
      },
    });

    // Ledger entry for refund reversal/impact
   await this.ledger.addRefundEntry(
  refund.id,
  tenantId,
  Number(refund.amount),
  refund.currency,
  'default-account-id'   // ✅ customer has no accountId field
);

    // Blockchain payout optionally via env flag (non-blocking if failure handled)
    const useBlockchain = process.env.USE_BLOCKCHAIN_REFUNDS === 'true';
    if (useBlockchain) {
      (async () => {
        try {
          // Map wallets according to your business rules
          const fromWallet = await this.prisma.wallet.findFirst({ where: { tenantId } });
          const customerWallet = await this.prisma.wallet.findFirst({
            where: { tenantId /* and mapping to customer if available */ },
          });

          if (fromWallet && customerWallet) {
            const { txHash } = await this.blockchain.sendFunds(
              fromWallet.address,
              customerWallet.address,
              String(refund.amount),
              refund.currency,
              { idempotencyKey: refund.id },
            );
            await this.prisma.refund.update({ where: { id: refund.id }, data: { blockchainTxHash: txHash } });
            // add ledger metadata update for txHash
      await this.ledger.createEntry({
  tenantId,
  type: 'DEBIT',
  amount: Number(refund.amount),
  accountId: 'default-account-id',  // ✅ safe fallback
  currency: refund.currency,
  description: `Refund Blockchain Payout ${refund.id}`,
  referenceId: refund.id,
});
          } else {
            this.logger.debug('blockchain refund skipped - wallets not mapped');
          }
        } catch (err) {
          this.logger.error('blockchain refund failed', err);
          // mark refund failed OR create alert depending on business rules
          await this.prisma.refund.update({ where: { id: refund.id }, data: { status: 'failed' } });
        }
      })();
    }

    // Notify (fire-and-forget)
    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'refund_approved', {
          refundId: refund.id,
          customerId: refund.customerId,
          amount: Number(refund.amount),
          currency: refund.currency,
          approvedBy: approverUserId,
        });
      } catch (err) {
        this.logger.warn('notification send failed for refund_approved', err);
      }
    })();

    return { refundId: refund.id, status: 'approved', reversalTransactionId: reversalTx.id };
  }

  async getRefund(tenantId: string, id: string) {
    const r = await this.prisma.refund.findFirst({
      where: { id, tenantId },
      include: { original: true, customer: true },
    });
    if (!r) throw new NotFoundException('refund not found');
    return r;
  }
}
