import { Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { JwtGuard } from '../auth/guards';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/guards';
import { AuditService } from './audit.service';
import { ExportService } from '../exports/exports.service';
import { AuditFilterDto } from '../exports/dto';

@UseGuards(JwtGuard, RolesGuard)
@Controller('v1/audit')
export class AuditExportController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private exporter: ExportService,
  ) {}

  @Get('export')
  @Roles('ADMIN')
  async exportAudit(@Req() req: any, @Query() filters: AuditFilterDto, @Res() res: Response) {
    const { type, q, dateFrom, dateTo, format = 'csv' } = filters;

    const where: any = {
      tenantId: req.user.tenantId,
      action: type || undefined,
      createdAt: (dateFrom || dateTo) ? {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
    if (q) {
      where.OR = [
        { userId: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const buffer = await this.exporter.generate(items, format as any);

    await this.audit.logAction({
      tenantId: req.user.tenantId,
      userId: req.user.id || req.user.userId || 'system',
      action: 'ADMIN_EXPORT_AUDIT',
      details: { filters, count: items.length, format, sensitive: true },
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', `attachment; filename=audit-${Date.now()}.${format}`);
    res.end(buffer);
  }
}
