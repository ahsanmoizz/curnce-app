// apps/api/src/module/ap/ap.overdue.cron.ts
import cron from 'node-cron';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const prisma = new PrismaService();
const logger = new Logger('ApOverdueCron');

cron.schedule('0 2 * * *', async () => {
  logger.log('Running AP overdue cron (daily @02:00)');
  try {
    const today = new Date();

    const overdue = await prisma.bill.findMany({
      where: { status: { not: 'paid' }, dueDate: { lt: today } },
      include: { tenant: true, vendor: true },
    });

    if (overdue.length) {
      logger.warn(`Overdue bills found: ${overdue.length}`);

      await Promise.allSettled(
        overdue.map(async (bill) => {
          try {
            // Mark bill as overdue if not already
            if (bill.status !== 'overdue') {
              await prisma.bill.update({
                where: { id: bill.id },
                data: { status: 'overdue' },
              });
            }

            // Create notification if notifications model exists
            await prisma.notification?.create?.({
              data: {
                tenantId: bill.tenantId,
                type: 'ap_overdue',
                title: `Overdue bill: ${bill.invoiceNo}`,
                message: `Bill for ${bill.vendor?.name || 'vendor'} is overdue.`,
                severity: 'warning',
                channel: 'email',
              },
            });
          } catch (err: any) {
            logger.warn(
              `Failed processing overdue bill ${bill.id} for tenant ${bill.tenantId}: ${err.message}`,
            );
          }
        }),
      );
    }
  } catch (e) {
    logger.error('AP overdue cron failed', e as any);
  }
});
