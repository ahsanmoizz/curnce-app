// src/module/tenants/tenant.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new tenant and bootstrap system accounts
   * Runs inside a transaction so tenant + accounts are always consistent
   */
  async createTenant(data: { name: string; country: string; currency: string }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tenant create karo
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          country: data.country,
          currency: data.currency,
          status: 'active',
        },
      });

      // 2. Default system accounts define
      const accounts = [
        { code: '1000', name: 'Cash', type: AccountType.ASSET },
        { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
        { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
        { code: '2100', name: 'Tax Liability', type: AccountType.LIABILITY },
        { code: '3000', name: 'Equity', type: AccountType.EQUITY },
        { code: '4000', name: 'Revenue', type: AccountType.INCOME },
        { code: '5000', name: 'Expenses', type: AccountType.EXPENSE },
        { code: '6000', name: 'Payroll Expense', type: AccountType.EXPENSE },
      ];

      // 3. Accounts seed karo
      await tx.account.createMany({
        data: accounts.map((acc) => ({
          tenantId: tenant.id,
          currency: data.currency,
          ...acc,
        })),
        skipDuplicates: true, // 👈 safe in case of rerun
      });

      // 4. Fresh tenant + accounts return karo
      return tx.tenant.findUnique({
        where: { id: tenant.id },
        include: { accounts: true },
      });
    });
  }

  /**
   * Ensure system accounts exist for an existing tenant
   * Useful for migrations or older tenants
   */
  async ensureSystemAccounts(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const accounts = [
      { code: '1000', name: 'Cash', type: AccountType.ASSET },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '2100', name: 'Tax Liability', type: AccountType.LIABILITY },
      { code: '3000', name: 'Equity', type: AccountType.EQUITY },
      { code: '4000', name: 'Revenue', type: AccountType.INCOME },
      { code: '5000', name: 'Expenses', type: AccountType.EXPENSE },
      { code: '6000', name: 'Payroll Expense', type: AccountType.EXPENSE },
    ];

    await this.prisma.account.createMany({
      data: accounts.map((acc) => ({
        tenantId,
        currency: tenant.currency,
        ...acc,
      })),
      skipDuplicates: true,
    });

    // Ensure ke baad fresh accounts return karo
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }
}
