import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';   
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  async createTicket(
    tenantId: string,
    customerId: string | null,
    subject: string,
    category: string | null,
    priority: string | null,
    userId: string,
  ) {
    if (!subject || subject.trim().length === 0) {
      throw new BadRequestException('subject required');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId,
        customerId,
        subject,
        category: category || null,
        priority: priority || 'medium',
        status: 'open',
      },
    });

    // Notify (admins/support) - fire & forget
    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'ticket_created', {
          ticketId: ticket.id,
          subject,
          category,
          priority,
          createdBy: userId,
        });
      } catch (err) {
        // swallow: notification failures shouldn't fail ticket creation
        // logger not injected to keep minimal; if you want, add Logger
      }
    })();

    // Audit
    await this.audit.logAction({
      tenantId,
      userId,
      action: 'TICKET_CREATED',
      details: { ticketId: ticket.id, subject },
    });

    return ticket;
  }

  async addMessage(ticketId: string, senderId: string, content: string, tenantId: string) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('content required');
    }
    // ensure ticket exists & belongs to tenant
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException('ticket not found');

    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId,
        content,
      },
    });

    // Notify participants (fire & forget)
    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'ticket_message', {
          ticketId,
          messageId: msg.id,
          from: senderId,
          snippet: content.slice(0, 200),
        });
      } catch (err) {
        // ignore
      }
    })();

    // Audit
    await this.audit.logAction({
      tenantId,
      userId: senderId,
      action: 'TICKET_MESSAGE_ADDED',
      details: { ticketId, messageId: msg.id, snippet: content.slice(0, 200) },
    });

    return msg;
  }

  async updateStatus(ticketId: string, status: string, userId: string, tenantId: string) {
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) throw new BadRequestException(`status must be one of ${allowed.join(', ')}`);

    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException('ticket not found');

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    // Audit
    await this.audit.logAction({
      tenantId,
      userId,
      action: 'TICKET_STATUS_UPDATED',
      details: { ticketId, status },
    });

    // Notify
    (async () => {
      try {
        await this.notifications.sendNotification(tenantId, 'ticket_status_changed', {
          ticketId,
          status,
          changedBy: userId,
        });
      } catch (err) {
        // ignore
      }
    })();

    return updated;
  }

  async listTickets(tenantId: string, status?: string) {
    return this.prisma.supportTicket.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { customer: true, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicket(ticketId: string, tenantId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, customer: true },
    });
    if (!ticket) throw new NotFoundException('ticket not found');
    return ticket;
  }
}
