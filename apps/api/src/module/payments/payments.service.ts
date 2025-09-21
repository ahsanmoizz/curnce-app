import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ComplianceService } from '../compliance/compliance.service';
import { ethers } from 'ethers';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private chain: BlockchainService,
    private ledger: LedgerService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private compliance: ComplianceService,
  ) {}

  private enforceMultisigGate(tenantId: string) {
    if (process.env.MULTISIG_DISABLED !== 'true') {
      throw new ForbiddenException(
        'Multisig enforced: hot wallet release/refund disabled',
      );
    }
  }

  private async findPaymentIntentOrThrow(
    paymentId: string,
    tenantId?: string,
  ) {
    const where: any = { paymentId };
    if (tenantId) where.tenantId = tenantId;
    const p = await this.prisma.paymentIntent.findFirst({ where });
    if (!p) throw new ForbiddenException('Payment not found');
    return p;
  }

  async createIntent(
    tenantId: string,
    dto: {
      customerId?: string;
      payeeId?: string;
      token?: string | null;
      amount: string;
      currency: string;
    },
  ) {
    const { randomBytes } = require('crypto');
    const paymentId = Buffer.from(randomBytes(16)).toString('hex');
    const paymentIdBytes32 = this.chain.toBytes32(paymentId);

    const tokenAddr = dto.token || this.chain.zeroAddress();
    const amountWei = await this.chain.parseAmount(dto.amount, dto.token);

    await this.chain.createPayment({
      tenantId,
      userId: null,
      paymentIdBytes32,
      payer: this.chain.zeroAddress(),
      payee: await this.chain.payeeAddressForTenant(tenantId, dto.payeeId),
      token: tokenAddr,
      amountWei,
    });

    return this.prisma.paymentIntent.create({
      data: {
        tenantId,
        customerId: dto.customerId || null,
        payeeId: dto.payeeId || null,
        paymentId,
        token: dto.token || null,
        tokenAddress: tokenAddr,
        amount: dto.amount as any,
        currency: dto.currency,
        status: 'created',
        chainId: this.chain.chainId(),
      } as any,
    });
  }

  async getStatus(tenantId: string, paymentId: string) {
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { tenantId, paymentId },
    });
    if (!intent) throw new NotFoundException('Payment not found');
    const onchain = await this.chain.getPayment(
      this.chain.toBytes32(paymentId),
    );
    return { intent, onchain };
  }

  async release(tenantId: string, paymentId: string, userId: string) {
    this.enforceMultisigGate(tenantId);

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { tenantId, paymentId },
    });
    if (!intent) throw new NotFoundException('Payment not found');

    const compliance = await this.compliance.runCheck(intent.id, tenantId);
    if (compliance.status !== 'passed') {
      await this.audit.logAction({
        tenantId,
        userId,
        action: 'COMPLIANCE_FAIL',
        details: {
          paymentId,
          status: compliance.status,
          rules: compliance.rules,
        },
      });
      await this.notifications.sendNotification(
        tenantId,
        'payment_compliance_blocked',
        { paymentId, status: compliance.status },
      );
      throw new ForbiddenException(
        '❌ Compliance check failed or requires review',
      );
    }

    const bytes32 = ethers.utils.formatBytes32String(intent.paymentId);
    const txHash = await this.chain.release(tenantId, userId, bytes32);

    return this.prisma.paymentIntent.update({
      where: { paymentId },
      data: {
        status: 'released',
        txHashSettle: txHash,
        onchainTxHash: txHash,
      },
    });
  }

  async refund(tenantId: string, paymentId: string, userId: string) {
    this.enforceMultisigGate(tenantId);

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { tenantId, paymentId },
    });
    if (!intent) throw new NotFoundException('Payment not found');

    const bytes32 = ethers.utils.formatBytes32String(intent.paymentId);
    const txHash = await this.chain.refund(tenantId, userId, bytes32);

    return this.prisma.paymentIntent.update({
      where: { paymentId },
      data: {
        status: 'refunded',
        txHashSettle: txHash,
        onchainTxHash: txHash,
      },
    });
  }

  async forceCancel(tenantId: string, paymentId: string, adminUserId: string) {
    const p = await this.findPaymentIntentOrThrow(paymentId, tenantId);
    if (!['created', 'pending'].includes(p.status)) {
      throw new ForbiddenException('Cannot cancel once funded/released');
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { paymentId },
      data: { status: 'cancelled' },
    });

    await this.audit.logAction({
      tenantId,
      userId: adminUserId || 'admin',
      action: 'PAYMENT_FORCE_CANCEL',
      details: { paymentId },
    });

    return { success: true, payment: updated };
  }

  async freeze(tenantId: string, paymentId: string, adminUserId: string) {
    const p = await this.findPaymentIntentOrThrow(paymentId, tenantId);
    if (!['created', 'funded'].includes(p.status)) {
      throw new ForbiddenException('Only created/funded payments can be frozen');
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { paymentId },
      data: { status: 'frozen' },
    });

    await this.audit.logAction({
      tenantId,
      userId: adminUserId || 'admin',
      action: 'PAYMENT_FROZEN',
      details: { paymentId },
    });

    return { success: true, payment: updated };
  }
}
