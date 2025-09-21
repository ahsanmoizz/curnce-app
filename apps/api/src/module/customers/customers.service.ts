import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class CustomersService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService) {
    this.s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});
  this.bucket = process.env.S3_BUCKET || 'ufa-docs';
  }

  async create(tenantId: string, body: any) {
    if (!body.name || !body.email) throw new BadRequestException('name, email required');
    return this.prisma.customer.create({
      data: { tenantId, name: body.name, email: body.email, phone: body.phone || null },
    });
  }

  async get(tenantId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('customer not found');
    return c;
  }

  async setStatus(tenantId: string, id: string, status: 'active'|'under_review'|'blocked') {
    const c = await this.get(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { status },
    });
  }

  async uploadDocument(tenantId: string, id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file required');
    const c = await this.get(tenantId, id);

    const key = `customers/${tenantId}/${id}/${Date.now()}_${file.originalname}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const docsArr = Array.isArray(c.documents) ? (c.documents as any[]) : [];
    docsArr.push({ key, name: file.originalname, mime: file.mimetype, size: file.size, uploadedAt: new Date().toISOString() });

    return this.prisma.customer.update({
      where: { id: c.id },
      data: { documents: docsArr as any },
    });
  }
}
