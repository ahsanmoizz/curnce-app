// apps/api/src/module/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type Series = { labels: string[]; values: number[] };
type KPI = Record<string, number | string>;

const CACHE_TTL_MS = 5 * 60_000; // 5 min

type CacheEntry<T> = { expiresAt: number; value: T };
const cache = new Map<string, CacheEntry<any>>();

function cacheKey(kind: string, tenantId: string) {
  return `${kind}:${tenantId}`;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private prisma: PrismaService) {}

  private getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T) {
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async getPaymentStats(tenantId: string) {
    const key = cacheKey('payments', tenantId);
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    // Prefer PaymentIntent table name (used elsewhere in your code).
    const rows: Array<{ month: string; amount: number }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COALESCE(SUM(CAST("amount" AS numeric)), 0)::float AS amount
        FROM "PaymentIntent"
        WHERE "tenantId" = $1
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        tenantId,
      );

    const totals = await this.prisma.$queryRawUnsafe<
      Array<{ status: string; cnt: number; sum: number }>
    >(
      `
      SELECT "status", COUNT(*)::int as cnt, COALESCE(SUM(CAST("amount" AS numeric)),0)::float as sum
      FROM "PaymentIntent"
      WHERE "tenantId" = $1
      GROUP BY "status"
      `,
      tenantId,
    );

    const totalPayments = totals.reduce((s, r) => s + (r.cnt || 0), 0);
    const released = totals.find((r) => r.status === 'released')?.cnt || 0;
    const refunded = totals.find((r) => r.status === 'refunded')?.cnt || 0;
    const pending = totals.find((r) => r.status === 'pending')?.cnt || 0;

    const labels = rows.map((r) => r.month);
    const values = rows.map((r) => r.amount);

    const result = {
      kpis: {
        totalPayments,
        released,
        refunded,
        pending,
      } as KPI,
      series: { labels, values } as Series,
    };

    this.setCached(key, result);
    return result;
  }

  async getLedgerSummary(tenantId: string) {
    const key = cacheKey('ledger', tenantId);
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    // Sum debits and credits for current balance
    const [debitAgg, creditAgg] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ sum: number }>>(
        `
        SELECT COALESCE(SUM(CAST("debit" AS numeric)),0)::float as sum
        FROM "Entry"
        WHERE "tenantId" = $1
        `,
        tenantId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ sum: number }>>(
        `
        SELECT COALESCE(SUM(CAST("credit" AS numeric)),0)::float as sum
        FROM "Entry"
        WHERE "tenantId" = $1
        `,
        tenantId,
      ),
    ]);
    const debits = debitAgg?.[0]?.sum || 0;
    const credits = creditAgg?.[0]?.sum || 0;
    const balance = debits - credits;

    // Monthly inflows/outflows (by month)
    const inflowRows: Array<{ month: string; amount: number }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COALESCE(SUM(CAST("debit" AS numeric)),0)::float as amount
        FROM "Entry"
        WHERE "tenantId" = $1
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        tenantId,
      );

    const outflowRows: Array<{ month: string; amount: number }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COALESCE(SUM(CAST("credit" AS numeric)),0)::float as amount
        FROM "Entry"
        WHERE "tenantId" = $1
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        tenantId,
      );

    const labels = Array.from(
      new Set([...inflowRows.map((r) => r.month), ...outflowRows.map((r) => r.month)]),
    ).sort();
    const inflows = labels.map(
      (m) => inflowRows.find((r) => r.month === m)?.amount || 0,
    );
    const outflows = labels.map(
      (m) => outflowRows.find((r) => r.month === m)?.amount || 0,
    );

    const result = {
      kpis: {
        balance,
        inflowsTotal: inflows.reduce((s, v) => s + v, 0),
        outflowsTotal: outflows.reduce((s, v) => s + v, 0),
      } as KPI,
      series: {
        labels,
        inflows,
        outflows,
      },
    };

    this.setCached(key, result);
    return result;
  }

  async getComplianceStats(tenantId: string) {
    const key = cacheKey('compliance', tenantId);
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    // Legal queries
    const [totalQueries, flaggedQueries, answeredQueries] = await Promise.all([
      this.prisma.legalQuery.count({ where: { tenantId } }),
      this.prisma.legalQuery.count({ where: { tenantId, status: 'flagged' } }),
      this.prisma.legalQuery.count({ where: { tenantId, status: 'answered' } }),
    ]);

    // Compliance notifications per month
    const notifRows: Array<{ month: string; count: number }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM "Notification"
        WHERE "tenantId" = $1 AND "type" = 'compliance'
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        tenantId,
      );

    const labels = notifRows.map((r) => r.month);
    const values = notifRows.map((r) => r.count);

    const risk =
      totalQueries === 0 ? 0 : Math.round((flaggedQueries / totalQueries) * 100);

    const result = {
      kpis: {
        totalQueries,
        flaggedQueries,
        answeredQueries,
        riskPercent: risk,
      } as KPI,
      series: { labels, values } as Series,
    };

    this.setCached(key, result);
    return result;
  }
}
