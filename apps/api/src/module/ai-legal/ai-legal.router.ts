import { Router } from 'express';
import { AiLegalService } from './ai-legal.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExportService } from '../exports/exports.service';
import { AskLegalQueryDto } from './dto/ask-legal-query.dto';
import { LegalQueryFilterDto } from '../exports/dto';

export function buildAiLegalRouter(
  aiLegalService: AiLegalService,
  prisma: PrismaService,
  audit: AuditService,
  exporter: ExportService,
) {
  const router = Router();

  /**
   * POST /v1/legal/query
   * Create a new legal query
   */
  router.post('/query', async (req: any, res) => {
    try {
      const dto: AskLegalQueryDto = { ...req.body, tenantId: req.user?.tenantId, userId: req.user?.id };
      if (!dto.tenantId) return res.status(403).json({ error: 'Tenant missing' });

      const query = await aiLegalService.createQuery(dto);
      res.json(query);
    } catch (err: any) {
      console.error('❌ Error creating query:', err);
      res.status(500).json({ error: 'Failed to create query' });
    }
  });

  /**
   * GET /v1/legal/query/:id
   * Get query by ID
   */
  router.get('/query/:id', async (req: any, res) => {
    try {
      const result = await prisma.legalQuery.findFirst({
        where: { id: req.params.id, tenantId: req.user?.tenantId },
      });
      if (!result) return res.status(404).json({ error: 'Not found' });
      res.json(result);
    } catch (err: any) {
      console.error('❌ Error fetching query:', err);
      res.status(500).json({ error: 'Failed to fetch query' });
    }
  });

  /**
   * GET /v1/legal/queries
   * List all queries with filters + pagination
   */
  router.get('/queries', async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: 'Tenant missing' });

      const { category, status, page = '1', limit = '20' } = req.query as any;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: any = {
        tenantId,
        category: category || undefined,
        status: status || undefined,
      };

      const [items, total] = await Promise.all([
        prisma.legalQuery.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.legalQuery.count({ where }),
      ]);

      res.json({
        items,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err: any) {
      console.error('❌ Error listing queries:', err);
      res.status(500).json({ error: 'Failed to list queries' });
    }
  });

  /**
   * PATCH /v1/legal/query/:id/resolve
   * Mark a query as resolved
   */
  router.patch('/query/:id/resolve', async (req: any, res) => {
    try {
      const result = await prisma.legalQuery.updateMany({
        where: { id: req.params.id, tenantId: req.user?.tenantId },
        data: { status: 'resolved' },
      });
      if (!result.count) return res.status(404).json({ error: 'Not found' });

      res.json({ success: true });
    } catch (err: any) {
      console.error('❌ Error resolving query:', err);
      res.status(500).json({ error: 'Failed to resolve query' });
    }
  });

  /**
   * GET /v1/legal/queries/summary
   * Summary for pending queries (DB backed)
   */
  router.get('/queries/summary', async (req: any, res) => {
    try {
      const tenantId: string = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: 'Tenant missing' });

      const pendingCount = await prisma.legalQuery.count({
        where: { tenantId, status: 'pending' },
      });
      res.json({ pendingCount });
    } catch (err: any) {
      console.error('❌ Error fetching summary:', err);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  /**
   * GET /v1/legal/queries/export
   * Export queries (CSV / Excel / JSON) with audit log
   */
  router.get('/queries/export', async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: 'Tenant missing' });

      const { category, status, q, format = 'csv' } = req.query as LegalQueryFilterDto;

      const where: any = {
        tenantId,
        category: category || undefined,
        status: status || undefined,
      };
      if (q) {
        where.OR = [
          { question: { contains: q, mode: 'insensitive' } },
          { answer: { contains: q, mode: 'insensitive' } },
        ];
      }

      const items = await prisma.legalQuery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const buffer = await exporter.generate(items, format as any);

      await audit.logAction({
        tenantId,
        userId: req.user?.id || req.user?.userId || 'system',
        action: 'ADMIN_EXPORT_LEGAL',
        details: { filters: req.query, count: items.length, format, sensitive: true },
        ip: req.ip,
      });

      res.setHeader('Content-Disposition', `attachment; filename=legal-${Date.now()}.${format}`);
      res.end(buffer);
    } catch (err: any) {
      console.error('❌ Error exporting queries:', err);
      res.status(500).json({ error: 'Failed to export queries' });
    }
  });

  return router;
}
