import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(params: {
    tenantId: string;
    userId: string;
    action: string;
    details: any;
    ip?: string;
  }) {
      console.log('logAction params:', params); 
    const { tenantId, userId, action, details, ip } = params;
  return this.prisma.auditLog.create({
  data: {
    tenantId,
    userId: userId ?? null,  // ✅ ab null pass kar sakte ho
    action,
    details,
    ipAddress: ip || null,
  },
});

  }
}
