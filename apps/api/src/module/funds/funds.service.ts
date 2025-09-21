import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FundsService {
  private readonly logger = new Logger(FundsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private blockchain: BlockchainService,
    private audit: AuditService,
  ) {}

  async transferFunds(
    tenantId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: string | number,
    currency: string,
    user: { id: string; tenantId: string },
  ) {
    if (!fromWalletId || !toWalletId || !amount) {
      throw new BadRequestException('fromWalletId,toWalletId,amount required');
    }

    // load wallets
    const [from, to] = await Promise.all([
      this.prisma.wallet.findFirst({ where: { id: fromWalletId, tenantId } }),
      this.prisma.wallet.findFirst({ where: { id: toWalletId, tenantId } }),
    ]);
    if (!from) throw new NotFoundException('from wallet not found');
    if (!to) throw new NotFoundException('to wallet not found');

    // currency mismatch check
    if (from.currency !== currency || to.currency !== currency) {
      throw new BadRequestException('currency mismatch with wallets');
    }

    // optimistic: create FundTransfer record (pending)
    const transfer = await this.prisma.fundTransfer.create({
      data: {
        tenantId,
        fromWalletId,
        toWalletId,
        amount: new Decimal(String(amount)),
        currency,
        status: 'pending',
      },
    });

    // write an initial ledger record
    await this.ledger.addFundTransferEntry(
  transfer.id,
  tenantId,
  Number(amount),
  currency,
  'pending',
  from.accountId || 'default-account-id'   // 👈 yahan dalna hoga
);

    try {
      const { txHash } = await this.blockchain.sendFunds(
        from.address,
        to.address,
        String(amount),
        currency,
        { idempotencyKey: transfer.id },
      );

      await this.prisma.fundTransfer.update({
        where: { id: transfer.id },
        data: { txHash, status: 'confirmed' },
      });

      await this.ledger.addFundTransferEntry(
  transfer.id,
  tenantId,
  Number(amount),
  currency,
  'confirmed',
  from.accountId || 'default-account-id'
);


      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: from.id },
          data: { balance: { decrement: new Decimal(String(amount)) } as any },
        }),
        this.prisma.wallet.update({
          where: { id: to.id },
          data: { balance: { increment: new Decimal(String(amount)) } as any },
        }),
      ]);

      // AUDIT: FUND_TRANSFER
      await this.audit.logAction({
        tenantId,
        userId: user.id,
        action: 'FUND_TRANSFER',
        details: {
          transferId: transfer.id,
          fromWalletId,
          toWalletId,
          amount,
          currency,
          txHash,
        },
      });

      return { transferId: transfer.id, txHash, status: 'confirmed' };
    } catch (err) {
      this.logger.error('transferFunds failed', err);
      await this.prisma.fundTransfer.update({
        where: { id: transfer.id },
        data: { status: 'failed' },
      });
    await this.ledger.addFundTransferEntry(
  transfer.id,
  tenantId,
  Number(amount),
  currency,
  'failed',
  from.accountId || 'default-account-id'
);

      throw err;
    }
  }

  async getTransferStatus(tenantId: string, id: string) {
    const t = await this.prisma.fundTransfer.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('transfer not found');

    if (t.status === 'pending' && t.txHash) {
      const status = await this.blockchain.getTxStatus(t.txHash);
      if (status !== t.status) {
        await this.prisma.fundTransfer.update({ where: { id }, data: { status } });
      }
      return { ...t, blockchainStatus: status };
    }
    return t;
  }
}
