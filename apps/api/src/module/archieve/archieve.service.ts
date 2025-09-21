import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ArchiveService {
  private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    } : undefined,
  });

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  private hash(buf: Buffer) {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  async storeDocument(params: { tenantId: string; filename: string; buffer: Buffer; contentType?: string }) {
    const { tenantId, filename, buffer, contentType } = params;
    const Bucket = process.env.S3_BUCKET!;
    const Key = `archive/${tenantId}/${Date.now()}_${filename}`;
    await this.s3.send(new PutObjectCommand({
      Bucket, Key, Body: buffer, ContentType: contentType || 'application/octet-stream'
    }));
    const s3Url = `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
    const fileHash = this.hash(buffer);

    // chain timestamp (hash anchor)
   const { txHash } = await this.blockchain.timestampDocument(this.hash(buffer));
// add this method if not present

    const saved = await this.prisma.archivedDocument.create({
      data: { tenantId, name: filename, s3Url, fileHash, txHash },
    });
    return saved;
  }
}
