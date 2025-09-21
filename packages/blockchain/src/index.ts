import { ethers } from 'ethers';

export interface ChainAdapter {
  getBalance(address: string, asset: string): Promise<string>;
  createTransfer(tx: {fromPk: string; to: string; amount: string; asset: string; chain: string}): Promise<{txHash: string}>;
}

export class PolygonAdapter implements ChainAdapter {
  constructor(private rpcUrl: string) {}
  async getBalance(address: string, asset: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const bal = await provider.getBalance(address);
    return ethers.formatEther(bal);
  }
  async createTransfer(_tx: {fromPk: string; to: string; amount: string; asset: string; chain: string}) {
    // Day 1: mock only
    return { txHash: '0xMOCKED_' + Math.random().toString(16).slice(2) };
  }
}
