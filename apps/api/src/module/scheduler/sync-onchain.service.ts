// apps/api/src/module/scheduler/sync-onchain.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ethers } from 'ethers';

const escrowAbi: any = (() => {
  try { return require('../../config/abi/EscrowManager.abi.json'); } catch { return []; }
})();

@Injectable()
export class SyncOnchainService {
  private readonly logger = new Logger(SyncOnchainService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private iface: ethers.utils.Interface | null = null;
  private escrowAddr: string | null = process.env.ESCROW_ADDRESS || null;

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {
    const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
    this.provider = new ethers.providers.JsonRpcProvider(rpc);
    if (Array.isArray(escrowAbi) && escrowAbi.length > 0) {
      this.iface = new ethers.utils.Interface(escrowAbi as any);
    } else {
      this.logger.warn('Escrow ABI not present — SyncOnchainService will be inactive until ABI is added.');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sync() {
    if (!this.iface || !this.escrowAddr) {
      this.logger.debug('SyncOnchainService: ABI or escrow address missing, skipping sync.');
      return;
    }

    // In production persist last processed block (OnchainSyncState). Dev uses fromBlock=0.
    const fromBlock = 0;
    const toBlock: number | 'latest' = 'latest';

    let logs: ethers.providers.Log[] = [];
    try {
      logs = await this.provider.getLogs({ address: this.escrowAddr, fromBlock, toBlock });
    } catch (err) {
      this.logger.error('getLogs failed', err as any);
      return;
    }

    for (const log of logs) {
      try {
        const parsed = this.iface!.parseLog(log);
        const name = parsed.name;
        const argsArray = Array.from(parsed.args as any[]);

        const paymentIdHex =
          (parsed.args && (parsed.args as any).paymentId && (parsed.args as any).paymentId.toString && (parsed.args as any).paymentId.toString()) ||
          (argsArray[0] && argsArray[0].toString && argsArray[0].toString()) ||
          '';

        const txHash = log.transactionHash;
        const blockNumber = log.blockNumber;

        // Upsert OnchainEvent (txHash unique)
        const onchain = await this.prisma.onchainEvent.upsert({
          where: { txHash },
          update: {},
          create: {
            tenantId: 'SYSTEM',
            paymentId: paymentIdHex,
            name,
            txHash,
            blockNumber,
            data: { args: argsArray.map((a: any) => (a?.toString?.() ?? a)) } as any,
          },
        });

        // Try map to PaymentIntent
        let intent: any = null;
        try {
          const prismaAny = this.prisma as any;
          intent = await prismaAny.paymentIntent.findFirst({
            where: {
              OR: [
                { paymentId: paymentIdHex },
                { paymentIdBytes32: paymentIdHex }, // if you added field
              ].filter(Boolean),
            },
          });
        } catch (e) {
          intent = await (this.prisma as any).paymentIntent.findFirst({ where: { paymentId: paymentIdHex } }).catch(() => null);
        }

        if (!intent) {
          this.logger.debug(`No PaymentIntent mapping found for ${paymentIdHex}`);
          continue;
        }

        const tenantId = intent.tenantId || 'SYSTEM';
        const userId = 'system';

        // determine amountBigNumber
        let amountBN: ethers.BigNumber | null = null;
        if ((parsed.args as any).amount !== undefined) {
          amountBN = (parsed.args as any).amount;
        } else {
          for (const a of argsArray) {
            if (a && typeof a === 'object' && typeof a.toString === 'function' && a._isBigNumber) {
              amountBN = a;
              break;
            }
          }
        }

        // determine decimals: if tokenAddress available, attempt to fetch decimals; fallback 18
        let decimals = 18;
        if (intent.tokenAddress) {
          try {
            const erc20Abi: any = (() => { try { return require('../../config/abi/MockERC20.abi.json'); } catch { return []; } })();
            if (Array.isArray(erc20Abi) && erc20Abi.length > 0) {
              const tokenContract = new ethers.Contract(intent.tokenAddress, erc20Abi, this.provider);
              decimals = Number(await tokenContract.decimals());
            }
          } catch (e) {
            this.logger.debug('Unable to fetch token decimals; defaulting to 18');
          }
        }

        const amountNum = amountBN ? Number(ethers.utils.formatUnits(amountBN, decimals)) : 0;

        // Create Ledger entry & link
        let ledgerEntry: any = null;
        try {
          if (name === 'PaymentReleased' || name === 'FundsReleased' || name === 'StablecoinReleased') {
            ledgerEntry = await (this.ledger as any).recordPaymentRelease({
              tenantId,
              paymentId: paymentIdHex,
              amount: amountNum,
              currency: intent.currency || (intent.tokenAddress ? 'TOKEN' : 'ETH'),
              account: intent.payeeId || intent.payeeAddress || 'UNKNOWN',
            });
          } else if (name === 'PaymentRefunded' || name === 'FundsRefunded' || name === 'StablecoinRefunded') {
            ledgerEntry = await (this.ledger as any).recordPaymentRefund({
              tenantId,
              paymentId: paymentIdHex,
              amount: amountNum,
              currency: intent.currency || (intent.tokenAddress ? 'TOKEN' : 'ETH'),
              account: intent.customerId || intent.payerAddress || 'UNKNOWN',
            });
          } else {
            // e.g. PaymentFunded / StablecoinDeposited -> mark funded
            ledgerEntry = await (this.ledger as any).addLedgerRecord(
              tenantId,
              'fund_transfer',
              intent.id,
              amountNum,
              intent.currency || (intent.tokenAddress ? 'TOKEN' : 'ETH'),
              undefined,
              { event: name, txHash }
            );
          }
        } catch (err) {
          this.logger.warn('Failed to create ledger entry for onchain event', err as any);
        }

        // create onchainLedgerLink if ledgerEntry exists
        if (ledgerEntry && ledgerEntry.id) {
          try {
            await this.prisma.onchainLedgerLink.create({
              data: { ledgerEntryId: ledgerEntry.id, onchainEventId: onchain.id },
            });
          } catch (err) {
            this.logger.warn('Failed to create OnchainLedgerLink', err as any);
          }
        }

        // update PaymentIntent status
        try {
          if (name === 'PaymentFunded' || name === 'StablecoinDeposited') {
            await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'funded', txHashFund: txHash } }).catch(()=>null);
          } else if (name === 'PaymentReleased' || name === 'FundsReleased' || name === 'StablecoinReleased') {
            await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'released', txHashSettle: txHash } }).catch(()=>null);
          } else if (name === 'PaymentRefunded' || name === 'FundsRefunded' || name === 'StablecoinRefunded') {
            await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'refunded', txHashSettle: txHash } }).catch(()=>null);
          }
        } catch (e) {
          this.logger.debug('paymentIntent update attempt failed', (e as any).message || e);
        }

        // audit + notify
        try {
          await this.audit.logAction({ tenantId, userId, action: `ONCHAIN_${name.toUpperCase()}`, details: { paymentId: paymentIdHex, txHash } });
        } catch (err) { this.logger.warn('audit failed', err as any); }
        try {
          await this.notifications.sendNotification(tenantId, `onchain_${name.toLowerCase()}`, { paymentId: paymentIdHex, txHash, event: name });
        } catch (err) { this.logger.warn('notify failed', err as any); }

      } catch (err) {
        this.logger.debug('Skipping log — parse/processing error (non-critical)', (err as any).message || err);
      }
    } // end for logs

    this.logger.debug(`SyncOnchainService: processed ${logs.length} logs`);
  }
}
