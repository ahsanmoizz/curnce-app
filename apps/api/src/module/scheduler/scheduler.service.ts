import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { ReportingService } from '../reporting/reporting.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private reporting: ReportingService,
    private notifications: NotificationsService,
  ) {}

  // 1st of every month at 00:00 UTC
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyComplianceReports() {
    this.logger.log('Running monthly compliance report job...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    const period = this.periodForPrevMonth();
    for (const t of tenants) {
      try {
        // If you already generate compliance via ComplianceService, hook that here instead.
        await this.reporting.generateComplianceReport(t.id, period);
        await this.notifications.sendNotification(
          t.id,
          'system_notice',
          `Compliance report generated for ${period}`,
        );
      } catch (err) {
        this.logger.error(`Compliance report failed for tenant=${t.id}`, err as any);
        await this.notifications.sendNotification(
          t.id,
          'system_notice',
          `Compliance report generation failed for ${period}`,
        );
      }
    }
  }

  // Daily at 09:00 UTC
  @Cron('0 9 * * *')
  async sendDeadlineReminders() {
    this.logger.log('Sending daily deadline reminders...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, name: true } });
    for (const t of tenants) {
      await this.notifications.sendNotification(
        t.id,
        'compliance_deadline',
        `Reminder: Check your upcoming compliance deadlines for tenant ${t.name}`,
      );
    }
  }

  private periodForPrevMonth() {
    const d = new Date();
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0..11 current month
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 12 : month; // 1..12
    const mm = String(prevMonth).padStart(2, '0');
    return `${prevYear}-${mm}`;
  }
}
