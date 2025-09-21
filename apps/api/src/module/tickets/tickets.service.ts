import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, body: any) {
    const { customerId, subject, message } = body;
    if (!customerId || !subject || !message) throw new BadRequestException('customerId, subject, message required');

    const t = await this.prisma.ticket.create({
      data: { tenantId, customerId, subject, status: 'open' },
    });
    await this.prisma.ticketMessage.create({
      data: { ticketId: t.id, sender: 'customer', message },
    });
    return this.get(tenantId, t.id);
  }

  async reply(tenantId: string, ticketId: string, sender: 'customer'|'support'|'system', message: string) {
    const t = await this.prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
    if (!t) throw new NotFoundException('ticket not found');
    await this.prisma.ticketMessage.create({ data: { ticketId, sender, message } });
    return this.get(tenantId, ticketId);
  }

  async get(tenantId: string, id: string) {
    const t = await this.prisma.ticket.findFirst({
      where: { id, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!t) throw new NotFoundException('ticket not found');
    return t;
  }
}
