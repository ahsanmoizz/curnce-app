"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonAdapter = void 0;
const ethers_1 = require("ethers");
class PolygonAdapter {
    constructor(rpcUrl) {
        this.rpcUrl = rpcUrl;
    }
    async getBalance(address, asset) {
        const provider = new ethers_1.ethers.JsonRpcProvider(this.rpcUrl);
        const bal = await provider.getBalance(address);
        return ethers_1.ethers.formatEther(bal);
    }
    async createTransfer(_tx) {
        // Day 1: mock only
        return { txHash: '0xMOCKED_' + Math.random().toString(16).slice(2) };
    }
}
exports.PolygonAdapter = PolygonAdapter;
