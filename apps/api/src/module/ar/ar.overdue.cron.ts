// apps/api/src/module/ar/ar.overdue.cron.ts
import cron from 'node-cron';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const prisma = new PrismaService();
const logger = new Logger('AROverdueCron');

// runs daily at 01:00
cron.schedule('0 1 * * *', async () => {
  logger.log('Running AR overdue cron');
  try {
    const today = new Date();
    const overdue = await prisma.invoice.findMany({
      where: { status: { not: 'paid' }, dueDate: { lt: today } },
      select: { id: true, tenantId: true, invoiceNo: true, amount: true, dueDate: true },
    });

   for (const inv of overdue) {
  // Update invoice status
  await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: 'overdue' },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      tenantId: inv.tenantId,
      type: 'invoice_overdue',
      severity: 'warning',
      title: `Invoice Overdue: ${inv.invoiceNo}`,
      channel: 'email',
      message: `Invoice ${inv.invoiceNo} is overdue`,
      details: { invoiceId: inv.id, dueDate: inv.dueDate, amount: inv.amount },
    },
  });
}

    logger.log(`AR overdue scan: ${overdue.length} invoices flagged`);
  } catch (e) {
    logger.error('AR overdue cron failed', e as any);
  }
});
