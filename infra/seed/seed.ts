// instead of just "@prisma/client"
import { PrismaClient } from "../../node_modules/@prisma/client";

import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo' },
    update: {},
    create: { id: 'demo', name: 'Demo Co', country: 'IN', currency: 'INR' }
  });

  await prisma.user.upsert({
    where: { email: 'owner@demo.co' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@demo.co',
      name: 'Owner',
      password: await import('bcrypt').then(m => m.hash('password', 10)),
      role: 'OWNER'
    }
  });

  const accounts = [
    { code: '1000', name: 'Cash & Bank', type: 'ASSET' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '3000', name: 'Equity', type: 'EQUITY' },
    { code: '4000', name: 'Sales', type: 'INCOME' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { code: '5100', name: 'Salaries', type: 'EXPENSE' },
    { code: '5200', name: 'Rent', type: 'EXPENSE' },
    { code: '5300', name: 'Travel', type: 'EXPENSE' },
    { code: '5400', name: 'Utilities', type: 'EXPENSE' },
    { code: '5500', name: 'Tax Payable', type: 'LIABILITY' },
    { code: '5600', name: 'GST Input Credit', type: 'ASSET' },
    { code: '5700', name: 'GST Output Tax', type: 'LIABILITY' }
  ];
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: a.code } },
      update: {},
      create: { tenantId: tenant.id, code: a.code, name: a.name, type: a.type as any, currency: 'INR' }
    });
  }

  console.log('Seeded demo tenant, user, and accounts.');
}

main().finally(() => prisma.$disconnect());
