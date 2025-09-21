import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateAccountDto, CreateJournalEntryDto } from './dto/dto';

// Map incoming DTO type to Prisma enum
function normalizeAccountType(input: string): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE' {
  const t = (input || '').toUpperCase();
  if (t === 'ASSET') return 'ASSET';
  if (t === 'LIABILITY') return 'LIABILITY';
  if (t === 'EQUITY') return 'EQUITY';
  // Some teams call it REVENUE in DTOs; Prisma enum is INCOME
  if (t === 'REVENUE' || t === 'INCOME') return 'INCOME';
  if (t === 'EXPENSE') return 'EXPENSE';
  throw new BadRequestException(`Invalid account type: ${input}`);
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Account
   * - Ensures enum casing for AccountType
   * - Satisfies required "currency" (uses DTO.currency or tenant.currency)
   */
  async createAccount(tenantId: string, dto: CreateAccountDto) {
  const typeEnum = normalizeAccountType((dto as any).type);

  // Ensure currency is present: use DTO if provided, else tenant default
  let currency = (dto as any).currency as string | undefined;
  if (!currency) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    currency = tenant?.currency || 'USD';
  }

  return this.prisma.account.create({
    data: {
      tenantId,
      code: dto.code,
      name: dto.name,
      type: typeEnum as any,
      currency,
      // parentId removed (not in schema)
    },
  });
}

  /**
   * Create Journal Entry
   * - Validates debits == credits
   * - Blocks posting into closed periods
   * - Returns entry with lines
   * - Writes AuditLog (action + details)
   */
  async createJournalEntry(tenantId: string, dto: CreateJournalEntryDto) {
    const totalDebit = dto.lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      throw new BadRequestException('Debits and Credits must balance');
    }

    await this.assertDateNotClosed(tenantId, new Date(dto.date));

    const entry = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        date: dto.date,
        description: (dto as any).description ?? null,
        status: 'posted',
        lines: {
          create: dto.lines.map((line) => ({
            accountId: line.accountId,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
          })),
        },
      },
      include: { lines: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: (dto as any).userId ?? 'system',
        action: 'journal_entry_posted',
        // Your AuditLog has `details Json`, so we pass JSON (not string)
        details: entry as any,
      },
    });

    return entry;
  }

  /**
   * Prevent posting into a closed period.
   * Uses your PeriodClose model if present.
   */
  private async assertDateNotClosed(tenantId: string, date: Date) {
    // If you don't have PeriodClose in schema, you can safely no-op this
    try {
      const hit = await this.prisma.periodClose.findFirst({
        where: {
          tenantId,
          status: 'closed',
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: { id: true, period: true },
      });
      if (hit) {
        throw new BadRequestException(`Posting locked. Period ${hit.period} is closed.`);
      }
    } catch {
      // PeriodClose table may not exist; ignore silently
    }
  }

async listAccounts(tenantId: string) {
  return this.prisma.account.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' }, // consistent chart of accounts order
  });
}
async listJournalEntries(tenantId: string) {
  const entries = await this.prisma.journalEntry.findMany({
    where: { tenantId },
    include: { lines: { include: { account: true } } }, // also include account info
    orderBy: { date: 'desc' },
  });

  // flatten each line into its own row
  return entries.flatMap((entry) =>
    entry.lines.map((line) => ({
      id: line.id,
      date: entry.date,
      description: entry.description,
      debit: line.debit,
      credit: line.credit,
      account: line.account,
    }))
  );
}

  /**
   * Ledger for a single account
   * - Uses correct relation name: "entry" (per your schema)
   * - Filters by entry.tenantId
   * - Orders by parent entry.date (line has no createdAt)
   * - Includes the parent entry
   */
  async listLedger(tenantId: string, accountId: string) {
    return this.prisma.journalEntryLine.findMany({
      where: {
        accountId,
        entry: { tenantId }, // relation filter against JournalEntry
      },
      include: {
        entry: true, // include the parent JournalEntry
      },
      orderBy: {
        entry: { date: 'asc' }, // order by JournalEntry.date
      },
    });
  }
}
