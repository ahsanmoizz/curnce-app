import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportingService } from '../reporting/reporting.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SchedulerService } from './scheduler.service';
import { SyncOnchainService } from '../scheduler/sync-onchain.service';
import { LedgerService } from '../ledger/ledger.service';
import { Logger } from '@nestjs/common';
import cron from 'node-cron';

// --- Initialize core services ---
const prisma = new PrismaService();
const audit = new AuditService(prisma);
const notifications = new NotificationsService(prisma, audit);
const reporting = new ReportingService(prisma, audit);
const ledger = new LedgerService(prisma, audit, notifications);

// Scheduler depends on reporting + notifications
const scheduler = new SchedulerService(prisma, reporting, notifications);

const logger = new Logger('SchedulerCron');

// --- CRON JOBS ---

// Monthly compliance report
cron.schedule('0 0 1 * *', async () => {
  logger.log('Running monthly compliance report job');
  try {
    await scheduler.generateMonthlyComplianceReports();
  } catch (err) {
    logger.error('Monthly compliance report job failed', err as any);
  }
});

// Daily deadline reminders
cron.schedule('0 9 * * *', async () => {
  logger.log('Sending daily deadline reminders');
  try {
    await scheduler.sendDeadlineReminders();
  } catch (err) {
    logger.error('Daily deadline reminders failed', err as any);
  }
});

// On-chain sync every minute
const syncOnchain = new SyncOnchainService(prisma, ledger, audit, notifications);
cron.schedule('* * * * *', async () => {
  logger.log('Running on-chain sync job');
  try {
    await syncOnchain.sync();
  } catch (err) {
    logger.error('On-chain sync failed', err as any);
  }
});


