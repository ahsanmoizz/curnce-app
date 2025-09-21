/*import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { Twilio } from 'twilio';

const MAX_RETRIES = Number(process.env.NOTIFICATIONS_MAX_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.NOTIFICATIONS_RETRY_DELAY_MS || 5000);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailTransport?: nodemailer.Transporter;
  private twilioClient?: Twilio;

  constructor(private prisma: PrismaService, private audit: AuditService) {
    if (process.env.SMTP_HOST) {
      this.mailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }
  }

  async sendInApp(
    tenantId: string,
    userId: string | null,
    payload: any,
  ) {
    const notification = await this.prisma.notification.create({
      data: { ...payload, tenantId, userId, channel: 'inapp' },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'NOTIFICATION_SENT',
      details: { channel: 'inapp', notificationId: notification.id },
    });

    return notification;
  }

 
  async sendNotification(tenantId: string, event: string, payload: any) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { tenantId, enabled: true },
    });
    const results: any[] = [];

    for (const ch of channels) {
      const log = await this.prisma.notificationLog.create({
        data: { tenantId, channelId: ch.id, event, payload, status: 'pending' },
      });

      try {
        await this.dispatchToChannel(ch, event, payload);
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'success', attempts: { increment: 1 } },
        });
        results.push({ channel: ch.type, status: 'success' });
      } catch (err: any) {
        this.logger.error(
          `notify channel=${ch.type} failed`,
          err?.message || err,
        );
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: String(err?.message || err),
          },
        });
        results.push({
          channel: ch.type,
          status: 'failed',
          error: String(err?.message || err),
        });
      } finally {
        await this.audit.logAction({
          tenantId,
          userId: 'system',
          action: 'NOTIFICATION_ATTEMPT',
          details: { event, channel: ch.type, result: results.at(-1) },
        });
      }
    }
    return results;
  }

  private async dispatchToChannel(ch: any, event: string, payload: any) {
    switch (ch.type) {
      case 'email':
        return this.sendEmail(ch.target, event, payload, ch.meta);
      case 'sms':
        return this.sendSms(ch.target, event, payload);
      case 'slack':
        return this.sendSlack(ch.target, event, payload);
      case 'webhook':
        return this.sendWebhook(ch.target, event, payload, ch.meta);
      default:
        throw new Error(`unknown channel type ${ch.type}`);
    }
  }

  private async sendEmail(to: string, subjectPrefix: string, payload: any, meta?: any) {
    if (!this.mailTransport) throw new Error('SMTP not configured');
    const fromName = process.env.SMTP_FROM_NAME || 'UFA';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@ufa.local';
    const subject = `[${subjectPrefix}] ${payload.subject || ''}`.trim();
    const html = meta?.templateHtml || `<pre>${JSON.stringify(payload, null, 2)}</pre>`;
    await this.mailTransport.sendMail({ from: `${fromName} <${fromEmail}>`, to, subject, html });
  }

  private async sendSms(to: string, event: string, payload: any) {
    if (!this.twilioClient) throw new Error('Twilio not configured');
    const body = payload.text || `${event}: ${payload.message || JSON.stringify(payload)}`;
    await this.twilioClient.messages.create({ body, from: process.env.TWILIO_FROM_NUMBER!, to });
  }

  private async sendSlack(webhookUrl: string, event: string, payload: any) {
    await axios.post(webhookUrl, { text: `*${event}*\n\`\`\`${JSON.stringify(payload, null, 2)}\`\`\`` }, { timeout: 5000 });
  }

  private async sendWebhook(url: string, event: string, payload: any, meta?: any) {
    await axios.post(url, { event, payload }, { headers: meta?.headers || undefined, timeout: 5000 });
  }

 
  async retryFailed(maxBatch = 50) {
    const failed = await this.prisma.notificationLog.findMany({
      where: { status: 'failed', attempts: { lt: MAX_RETRIES } },
      take: maxBatch,
      orderBy: { createdAt: 'asc' },
      include: { channel: true },
    });

    for (const log of failed) {
      try {
        await this.dispatchToChannel(log.channel, log.event, log.payload);
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'success', attempts: { increment: 1 } },
        });
      } catch (err: any) {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            attempts: { increment: 1 },
            lastError: String(err?.message || err),
            status: log.attempts + 1 >= MAX_RETRIES ? 'failed' : 'retrying',
          },
        });
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    return { retried: failed.length };
  }


  async list(tenantId: string, filters: any) {
    return this.prisma.notification.findMany({
      where: { tenantId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  
  async markRead(id: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { read: true },
    });
  }
}
*/
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';

const MAX_RETRIES = Number(process.env.NOTIFICATIONS_MAX_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.NOTIFICATIONS_RETRY_DELAY_MS || 5000);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async sendInApp(tenantId: string, userId: string | null, payload: any) {
    const notification = await this.prisma.notification.create({
      data: { ...payload, tenantId, userId, channel: 'inapp' },
    });

    await this.audit.logAction({
      tenantId,
      userId: userId || 'system',
      action: 'NOTIFICATION_SENT',
      details: { channel: 'inapp', notificationId: notification.id },
    });

    return notification;
  }

  async sendNotification(tenantId: string, event: string, payload: any) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { tenantId, enabled: true },
    });
    const results: any[] = [];

    for (const ch of channels) {
      const log = await this.prisma.notificationLog.create({
        data: { tenantId, channelId: ch.id, event, payload, status: 'pending' },
      });

      try {
        // Always succeed with dummy
        await this.dispatchToChannel(ch, event, payload);

        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'success', attempts: { increment: 1 } },
        });
        results.push({ channel: ch.type, status: 'success' });
      } catch (err: any) {
        // Should never happen, but just in case
        this.logger.error(`notify channel=${ch.type} failed`, err?.message || err);
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: String(err?.message || err),
          },
        });
        results.push({
          channel: ch.type,
          status: 'failed',
          error: String(err?.message || err),
        });
      } finally {
        await this.audit.logAction({
          tenantId,
          userId: 'system',
          action: 'NOTIFICATION_ATTEMPT',
          details: { event, channel: ch.type, result: results.at(-1) },
        });
      }
    }
    return results;
  }

  private async dispatchToChannel(ch: any, event: string, payload: any) {
    // Dummy handlers: Just log & resolve immediately
    switch (ch.type) {
      case 'email':
        return this.fakeSend('EMAIL', ch.target, event, payload);
      case 'sms':
        return this.fakeSend('SMS', ch.target, event, payload);
      case 'slack':
        return this.fakeSend('SLACK', ch.target, event, payload);
      case 'webhook':
        return this.fakeSend('WEBHOOK', ch.target, event, payload);
      default:
        return this.fakeSend('UNKNOWN', ch.target, event, payload);
    }
  }

  private async fakeSend(channel: string, target: string, event: string, payload: any) {
    this.logger.debug(`[DUMMY ${channel}] → ${target} :: ${event}`, JSON.stringify(payload));
    return Promise.resolve(true); // always succeed
  }

  async retryFailed(maxBatch = 50) {
    const failed = await this.prisma.notificationLog.findMany({
      where: { status: 'failed', attempts: { lt: MAX_RETRIES } },
      take: maxBatch,
      orderBy: { createdAt: 'asc' },
      include: { channel: true },
    });

    for (const log of failed) {
      try {
        await this.dispatchToChannel(log.channel, log.event, log.payload);
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'success', attempts: { increment: 1 } },
        });
      } catch (err: any) {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            attempts: { increment: 1 },
            lastError: String(err?.message || err),
            status: log.attempts + 1 >= MAX_RETRIES ? 'failed' : 'retrying',
          },
        });
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    return { retried: failed.length };
  }

  async list(tenantId: string, filters: any) {
    return this.prisma.notification.findMany({
      where: { tenantId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { read: true },
    });
  }
}
