import cron from 'node-cron';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from './notifications.service';
import { AuditService } from '../audit/audit.service';
import { Logger } from '@nestjs/common';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const notifications = new NotificationsService(prisma, auditService);
const logger = new Logger('NotificationRetryCron');

cron.schedule('*/5 * * * *', async () => {
  logger.log('Running notification retry job');
  try {
    const res = await notifications.retryFailed(100);
    logger.log(`Notification retry processed ${res.retried}`);
  } catch (err) {
    logger.error('Notification retry failed', err as any);
  }
});
