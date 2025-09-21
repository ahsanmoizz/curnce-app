import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';

const escrowAbi: any = (() => {
  try { return require('../../config/abi/EscrowManager.abi.json'); } catch { return []; }
})();
const erc20Abi: any = (() => {
  try { return require('../../config/abi/MockERC20.abi.json'); } catch { return []; }
})();

function toBytes32Hex(s: string) {
  const crypto = require('crypto');
  return '0x' + crypto.createHash('sha256').update(s).digest('hex');
}

@Injectable()
export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private escrow: ethers.Contract | null = null;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {
    const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
    this.provider = new ethers.providers.JsonRpcProvider(rpc);

    const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (pk) this.wallet = new ethers.Wallet(pk, this.provider);

    const escrowAddr = process.env.ESCROW_ADDRESS;
    if (escrowAddr && this.wallet && Array.isArray(escrowAbi) && escrowAbi.length > 0) {
      this.escrow = new ethers.Contract(escrowAddr, escrowAbi, this.wallet);
    }
  }

  chainId(): number { return Number(process.env.CHAIN_ID || 1337); }
  escrowAddress(): string | null { return process.env.ESCROW_ADDRESS || null; }
  zeroAddress(): string { return ethers.constants.AddressZero; }
  toBytes32(id: string) { return toBytes32Hex(id); }

  private requireWallet() {
    if (!this.wallet) throw new Error('Blockchain wallet not configured');
    if (process.env.USE_BLOCKCHAIN_PROD === 'true') {
      throw new Error('Hot wallet usage forbidden in production - use multisig/cold-signer');
    }
    return this.wallet;
  }

  async parseAmount(amountHuman: string, token?: string | null) {
    if (!token || token === ethers.constants.AddressZero || token === '0x0000000000000000000000000000000000000000') {
      return ethers.utils.parseEther(amountHuman).toString();
    }
    try {
      const tokenContract = new ethers.Contract(token as string, erc20Abi, this.provider);
      const decimals = await tokenContract.decimals();
      return ethers.utils.parseUnits(amountHuman, Number(decimals)).toString();
    } catch {
      return ethers.utils.parseUnits(amountHuman, 18).toString();
    }
  }

  async payeeAddressForTenant(_tenantId: string, _payeeId?: string | null) {
    if (!this.wallet) throw new Error('Wallet not configured');
    return this.wallet.address;
  }

  async createPayment(params: {
    tenantId: string; userId?: string | null;
    paymentIdBytes32: string; payer: string; payee: string; token: string; amountWei: string;
  }) {
    this.requireWallet();
    if (!this.escrow) throw new Error('Escrow contract not initialized');
    const tx = await this.escrow.createPayment(
      params.paymentIdBytes32,
      params.payer,
      params.payee,
      params.token,
      params.amountWei
    );
    const rc = await tx.wait();
    await this.audit.logAction({
      tenantId: params.tenantId,
      userId: params.userId || 'system',
      action: 'ONCHAIN_CREATE_PAYMENT',
      details: { paymentIdBytes32: params.paymentIdBytes32, txHash: rc.transactionHash },
    });
    return rc.transactionHash as string;
  }

  async release(tenantId: string, userId: string | null, paymentIdBytes32: string) {
    this.requireWallet();
    if (!this.escrow) throw new Error('Escrow contract not initialized');
    const tx = await this.escrow.release(paymentIdBytes32);
    const rc = await tx.wait();

   
   
    // mapping improvement may be needed
        await this.prisma.paymentIntent.updateMany({
  where: { 
    paymentId: paymentIdBytes32,
    tenantId, // ✅ ensure no cross-tenant overwrite
  },
 data: {
        onchainTxHash: rc.transactionHash,
        gasUsed: rc.gasUsed?.toString?.() ?? null,
        gasPrice: tx.gasPrice?.toString?.() ?? null,
      },
    }).catch(() => {});

    await this.audit.logAction({
      tenantId, userId: userId || 'system', action: 'PAYMENT_RELEASED_ONCHAIN',
      details: { paymentIdBytes32, txHash: rc.transactionHash },
    });
    return rc.transactionHash as string;
  }

  async refund(tenantId: string, userId: string | null, paymentIdBytes32: string) {
    this.requireWallet();
    if (!this.escrow) throw new Error('Escrow contract not initialized');
    const tx = await this.escrow.refund(paymentIdBytes32);
    const rc = await tx.wait();

    await this.prisma.paymentIntent.updateMany({
  where: { 
    paymentId: paymentIdBytes32,
    tenantId, // ✅ ensure no cross-tenant overwrite
  },

      data: {
        onchainTxHash: rc.transactionHash,
        gasUsed: rc.gasUsed?.toString?.() ?? null,
        gasPrice: tx.gasPrice?.toString?.() ?? null,
      },
    }).catch(() => {});

    await this.audit.logAction({
      tenantId, userId: userId || 'system', action: 'PAYMENT_REFUNDED_ONCHAIN',
      details: { paymentIdBytes32, txHash: rc.transactionHash },
    });
    return rc.transactionHash as string;
  }

  async getPayment(paymentIdBytes32: string) {
    if (!this.escrow) throw new Error('Escrow contract not initialized');
    const res = await this.escrow.getPayment(paymentIdBytes32);
    return {
      payer: res[0], payee: res[1], token: res[2],
      amountWei: res[3].toString(), status: Number(res[4]), hold: Boolean(res[5]),
    };
  }

    /**
   * Timestamp (anchor) a document hash on-chain.
   * Currently a safe stub if no contract method exists.
   * Returns object with txHash for downstream storage.
   */
  async timestampDocument(hash: string): Promise<{ txHash: string }> {
    // If escrow contract has a method to timestamp documents, call it here.
    // Example: await this.escrow.timestampDocument(hash);
    // But for now, return a deterministic mock txHash and audit it.
    const txHash = `doc-tx-${toBytes32Hex(hash).slice(2, 18)}-${Date.now()}`;
    try {
      await this.audit.logAction({
        tenantId: 'system',
        userId: 'system',
        action: 'DOCUMENT_TIMESTAMPED',
        details: { hash, txHash },
      });
    } catch (e) {
      // don't break if audit fails
      const msg = (e instanceof Error) ? e.message : String(e);
console.warn('...', msg);
    }
    return { txHash };
  }

  /**
   * sendFunds — generic helper to move funds on-chain.
   *
   * Usage patterns in the repo showed different call shapes, so this function aims to be flexible:
   * - If `from` is null/undefined, it will use the server wallet (requireWallet()).
   * - If `token` is falsy or equals zero address, it will send native ETH via contract release/refund flows where possible.
   * - If ERC20 token and Escrow contract supports direct transfer, we prefer escrow.release/refund style.
   *
   * Retur

  /**
   * getTxStatus(txHash) — simple status probe.
   * Returns 'pending' | 'confirmed' | 'failed'
   */

     async sendFunds(
  from: string | null,
  to: string,
  amountHuman: string,
  tokenAddr?: string | null,
  meta?: Record<string, any>   // 👈 added
) {
  try {
    const amountStr = await this.parseAmount(amountHuman, tokenAddr);
    this.requireWallet();
    if (!this.wallet) throw new Error('Wallet not initialized');

    let txResp;

    if (tokenAddr) {
      // ERC20 transfer
      const erc20 = new ethers.Contract(tokenAddr, erc20Abi, this.wallet);
      txResp = await erc20.transfer(to, amountStr);
    } else {
      // Native ETH transfer
      txResp = await this.wallet.sendTransaction({
        to,
        value: amountStr,
      });
    }

    await this.audit.logAction({
      tenantId: 'system',
      userId: from || 'system',
      action: 'ONCHAIN_SEND',
      details: { from, to, token: tokenAddr, amount: amountStr, ...meta }, // merge meta
    });

    return { txHash: txResp.hash as string };
  } catch (err) {
    const msg = (err instanceof Error) ? err.message : String(err);
    await this.audit.logAction({
      tenantId: 'system',
      userId: 'system',
      action: 'ONCHAIN_SEND_FAILED',
      details: { from, to, token: tokenAddr, amount: amountHuman, error: msg, ...meta },
    }).catch(() => {});
    throw err;
  }
}

  async getTxStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    if (!this.provider) return 'pending';
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return 'pending';
      if (receipt.status === 1 || receipt.status === undefined) return 'confirmed';
      return 'failed';
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
console.warn('...', msg);
      return 'pending';
    }
  }

}
