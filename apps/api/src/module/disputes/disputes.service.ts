import { Logger } from '@nestjs/common'; // keep logger if you want
import { PrismaService } from '../../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_STATUSES = [
  'open',
  'in_review',     // legacy
  'under_review',  // new
  'resolved',
  'rejected',      // new
  'escalated',     // legacy
] as const;

export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private blockchain: BlockchainService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async file(tenantId: string, body: any) {
    const { customerId, txId, reason } = body;
    if (!customerId || !txId || !reason) {
      const err: any = new Error('customerId, txId, reason required');
      err.status = 400;
      throw err;
    }

    // prevent duplicates (accept both legacy/new review statuses)
    const existing = await this.prisma.dispute.findFirst({
      where: { tenantId, customerId, txId, status: { in: ['open', 'in_review', 'under_review'] } },
    });
    if (existing) return existing;

    const dispute = await this.prisma.dispute.create({
      data: { tenantId, customerId, txId, reason, status: 'open' },
    });

    // audit + notify
    await this.audit.logAction({
      tenantId,
      userId: 'system',
      action: 'DISPUTE_FILED',
      details: { disputeId: dispute.id, txId, customerId },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'dispute_filed', {
          disputeId: dispute.id,
          txId,
          customerId,
          reason,
        });
      } catch (err: any) {
        this.logger.warn(`notification send failed for dispute_filed: ${err?.message || String(err)}`);
      }
    })();

    return dispute;
  }

  /**
   * resolve(tenantId, id, body, userId)
   * - expects caller (controller) to pass userId (approver)
   */
  async resolve(tenantId: string, id: string, body: any, userId: string) {
    const { status, resolution } = body;
    if (!ALLOWED_STATUSES.includes(status)) {
      const err: any = new Error(`status must be one of ${ALLOWED_STATUSES.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const d = await this.prisma.dispute.findFirst({ where: { id, tenantId } });
    if (!d) {
      const err: any = new Error('dispute not found');
      err.status = 404;
      throw err;
    }

    // prevent duplicate resolution attempts
    if (!['open', 'under_review', 'in_review'].includes(d.status)) {
      const err: any = new Error(`dispute already ${d.status}`);
      err.status = 400;
      throw err;
    }

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status, resolution: resolution || null },
    });

    // Audit + notify outcome
    await this.audit.logAction({
      tenantId,
      userId,
      action: 'DISPUTE_RESOLVED',
      details: { disputeId: id, status, resolution },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'dispute_resolved', {
          disputeId: id,
          status,
          resolution,
          resolvedBy: userId,
        });
      } catch (err: any) {
        this.logger.warn(`notification send failed for dispute_resolved: ${err?.message || String(err)}`);
      }
    })();

    // If resolved in customer's favor and resolution indicates refund, release funds
    if (status === 'resolved' && resolution === 'refund_customer') {
      try {
        let amountToRelease = 0;
        try {
          amountToRelease = Number((d as any).metadata?.amount || 0);
          if (isNaN(amountToRelease) || amountToRelease <= 0) amountToRelease = 0;
        } catch {
          amountToRelease = 0;
        }

        // NOTE: Adjust filters based on your Wallet model schema.
        const escrowWallet = await this.prisma.wallet.findFirst({
          where: { tenantId },
        });

        const customerWallet = await this.prisma.wallet.findFirst({
          where: { tenantId },
        });

        if (escrowWallet && customerWallet && amountToRelease > 0) {
  const { txHash } = await this.blockchain.sendFunds(
    escrowWallet.address,
    customerWallet.address,
    String(amountToRelease),
    'USDT',
    { idempotencyKey: `dispute-${id}` },
  );

  // 👇 yahi jagah par ye snippet lagana hai
  await this.ledger.createEntry({
    tenantId,
    type: 'DEBIT',
    amount: Number(amountToRelease),
    accountId: escrowWallet?.accountId || customerWallet?.accountId || 'default-account-id',
    currency: 'USDT',
    description: `Dispute Hold Release ${id}`,
    referenceId: id,
  });
} else {
  await this.ledger.createEntry({
    tenantId,
    type: 'DEBIT',
    amount: Number(amountToRelease),
    accountId: 'default-account-id',
    currency: 'USDT',
    description: `Dispute Hold ${id} (no wallets or amount)`,
    referenceId: id,
  });
}
      } catch (err: any) {
        this.logger.error(`dispute release failed: ${err?.message || String(err)}`, err?.stack);
        await this.prisma.dispute.update({ where: { id }, data: { status: 'escalated' } });
        throw err;
      }
    }

    return updated;
  }

  async get(tenantId: string, id: string) {
    const d = await this.prisma.dispute.findFirst({ where: { id, tenantId } });
    if (!d) {
      const err: any = new Error('dispute not found');
      err.status = 404;
      throw err;
    }
    return d;
  }
}
