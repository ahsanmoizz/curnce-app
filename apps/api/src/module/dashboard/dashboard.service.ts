import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const now = new Date();
    const fromMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const toMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    // Revenue = INCOME credits - debits (month)
    const incomeEntries = await this.prisma.entry.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromMonth, lte: toMonth },
        account: { type: 'INCOME' },
      },
      include: { account: true },
    });
    const revenueThisMonth = incomeEntries.reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0);

    const pendingDisputes = await this.prisma.dispute.count({
      where: { tenantId, status: { in: ['open', 'in_review'] } },
    });

    const refundStatsAgg = await this.prisma.refund.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const refundStats = refundStatsAgg.reduce((acc, r) => {
      acc[r.status] = {
        count: r._count?._all ?? 0,
        amount: Number(r._sum?.amount ?? 0),
      };
      return acc;
    }, {} as Record<string, {count:number; amount:number}>);

    // Risk score = proportion of HIGH risk in latest classifications (last 30d)
    const from30d = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const logs = await this.prisma.txClassificationLog.findMany({
      where: { tenantId, createdAt: { gte: from30d } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const byRisk = logs.reduce((acc: any, l: any) => {
      const level = (l.output?.riskLevel || 'LOW').toUpperCase();
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    const totalLogs = Object.values(byRisk).reduce((a: number, b: any) => a + (b as number), 0) || 1;
    const highPct = (byRisk['HIGH'] || 0) / totalLogs;
    const complianceRiskScore = Math.round(highPct * 100); // 0..100

    const walletBalances = await this.prisma.wallet.findMany({
      where: { tenantId },
      select: { id: true, label: true, currency: true, address: true },
    });

    return {
      revenueThisMonth,
      pendingDisputes,
      refundStats,
      complianceRiskScore,
      walletBalances,
    };
  }
}
