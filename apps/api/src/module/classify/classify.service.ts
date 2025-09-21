import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';

const AI_URL = process.env.AI_SERVICE_URL || 'http://13.60.194.219:8000';

@Injectable()
export class ClassifyService {
  constructor(private prisma: PrismaService) {}

  async classifyTransaction(tenantId: string, tx: {
    id: string;
    description: string;
    amount: number;
    counterparty?: string;
    branch?: string;
    currency?: string;
    country?: string;
  }) {
    const { data } = await axios.post(`${AI_URL}/v1/classify/transaction`, {
      description: tx.description,
      amount: tx.amount,
      counterparty: tx.counterparty,
      branch: tx.branch,
      currency: tx.currency,
      country: tx.country,
    });

    // log decision
    await this.prisma.txClassificationLog.create({
      data: {
        tenantId,
        transactionId: tx.id,
        modelVersion: data.modelVersion,
        input: {
          description: tx.description,
          amount: tx.amount,
          counterparty: tx.counterparty,
          branch: tx.branch,
          currency: tx.currency,
          country: tx.country,
        },
        output: data,
        confidence: data.confidence,
      },
    });

    return data as {
      modelVersion: string;
      category: string;
      taxCode: string | null;
      confidence: number;
    };
  }
}
