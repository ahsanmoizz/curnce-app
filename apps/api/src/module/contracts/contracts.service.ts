import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import OpenAI from 'openai';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';
import { Readable } from 'stream';
import pdfParse from 'pdf-parse';
const S3_ENDPOINT = process.env.S3_ENDPOINT!;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID!;   // ✅ FIXED
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY!; // ✅ FIXED
const S3_BUCKET = process.env.S3_BUCKET || 'ufa-docs';
const S3_USE_SSL = (process.env.S3_USE_SSL || 'false').toLowerCase() === 'true';

function s3Client() {
 return new S3Client({
  region: process.env.AWS_REGION || 'auto',   // ✅ picks from .env
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  tls: S3_USE_SSL,
});
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  // ✅ OpenAI client
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  /**
   * -------------------------
   * PDF Upload + Analysis
   * -------------------------
   */
  async uploadPdf(tenantId: string, file: Express.Multer.File) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported.');
    }

    const sha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    const existing = await this.prisma.document.findFirst({
      where: { tenantId, sha256, type: 'contract' },
    });
    if (existing) return existing;

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        type: 'contract',
        name: file.originalname,
        s3Key: 'pending',
        sha256,
      },
    });

    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const key = `contracts/${tenantId}/${doc.id}${ext}`;

    const s3 = s3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: 'application/pdf',
      }),
    );

    return this.prisma.document.update({
      where: { id: doc.id },
      data: { s3Key: key },
    });
  }

  async analyzeDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // ✅ Extract text from PDF locally
    const pdfBuffer = await this.downloadFromS3(doc.s3Key);
    const parsed = await pdfParse(pdfBuffer);
    const text: string = parsed.text || '';
    if (!text) throw new BadRequestException('Failed to extract text from PDF');

    // ✅ Analyze with OpenAI
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a contract risk analyzer. Extract risk level, summary, and key findings from the provided contract text. Respond in JSON with keys: riskLevel, summary, findings.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const output = response.choices[0].message?.content;
    if (!output) throw new BadRequestException('OpenAI analysis failed');

    // ✅ Parse JSON response
    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      parsedOutput = { riskLevel: 'medium', summary: output, findings: [] };
    }

    const { riskLevel, summary, findings } = parsedOutput;
    if (!riskLevel) throw new BadRequestException('Analysis failed');

    return this.prisma.contractAnalysis.create({
      data: { tenantId, documentId: doc.id, riskLevel, summary, findings },
    });
  }

  async getAnalysis(tenantId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const analysis = await this.prisma.contractAnalysis.findFirst({
      where: { tenantId, documentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) throw new NotFoundException('No analysis found');
    return analysis;
  }

  private async downloadFromS3(key: string): Promise<Buffer> {
    const s3 = s3Client();
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    const stream = obj.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * -------------------------
   * DB-Backed Contract Lifecycle
   * -------------------------
   */
  async createContract(
    tenantId: string,
    title: string,
    type: string,
    content: string,
    userId: string,
  ) {
    if (!title || !type || !content)
      throw new BadRequestException('title, type and content are required');

    const result = await this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: { tenantId, title, type, status: 'draft' },
      });

      const version = await tx.contractVersion.create({
        data: { contractId: contract.id, content, version: 1 },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: { currentVersionId: version.id },
      });
      return { contract, version };
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'CONTRACT_CREATED',
      details: { contractId: result.contract.id, title: result.contract.title },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'contract_created', {
          contractId: result.contract.id,
          title: result.contract.title,
          createdBy: userId,
        });
      } catch (err) {
        this.logger.warn(
          'notifications.sendNotification(contract_created) failed',
          err,
        );
      }
    })();

    return result.contract;
  }

  async addVersion(
    contractId: string,
    content: string,
    userId: string,
    tenantId: string,
  ) {
    if (!content) throw new BadRequestException('content required');

    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new NotFoundException('contract not found');

    const max = await this.prisma.contractVersion.aggregate({
      where: { contractId },
      _max: { version: true },
    });
    const nextVer = (max._max.version ?? 0) + 1;

    const version = await this.prisma.contractVersion.create({
      data: { contractId, content, version: nextVer },
    });

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { currentVersionId: version.id },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'CONTRACT_VERSION_ADDED',
      details: { contractId, version: nextVer },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(
          tenantId,
          'contract_version_added',
          {
            contractId,
            version: nextVer,
            addedBy: userId,
          },
        );
      } catch (err) {
        this.logger.warn(
          'notifications.sendNotification(contract_version_added) failed',
          err,
        );
      }
    })();

    return version;
  }

  async signContract(
    contractId: string,
    userId: string,
    role: string,
    signature: string,
    tenantId: string,
  ) {
    if (!signature) throw new BadRequestException('signature required');

    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new NotFoundException('contract not found');

    const sig = await this.prisma.contractSignature.create({
      data: { contractId, userId, role, signature },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'CONTRACT_SIGNED',
      details: { contractId, role },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'contract_signed', {
          contractId,
          signedBy: userId,
          role,
        });
      } catch (err) {
        this.logger.warn(
          'notifications.sendNotification(contract_signed) failed',
          err,
        );
      }
    })();

    return sig;
  }

  async updateStatus(
    contractId: string,
    status: string,
    tenantId: string,
    userId: string,
  ) {
    const allowed = [
      'draft',
      'pending_approval',
      'active',
      'completed',
      'disputed',
      'cancelled',
    ];
    if (!allowed.includes(status))
      throw new BadRequestException(
        `status must be one of ${allowed.join(', ')}`,
      );

    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new NotFoundException('contract not found');

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: { status },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'CONTRACT_STATUS_UPDATED',
      details: { contractId, status },
    });

    (async () => {
      try {
        await this.notifications.sendNotification(
          tenantId,
          'contract_status_updated',
          {
            contractId,
            status,
            changedBy: userId,
          },
        );
      } catch (err) {
        this.logger.warn(
          'notifications.sendNotification(contract_status_updated) failed',
          err,
        );
      }
    })();

    return updated;
  }

  async listContracts(tenantId: string, status?: string) {
    return this.prisma.contract.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { signatures: true, versions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContract(contractId: string, tenantId: string) {
    const c = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      include: { signatures: true, versions: true },
    });
    if (!c) throw new NotFoundException('contract not found');
    return c;
  }
}
