import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function ensureSystemAccounts(tenantId: string, currency: string) {
  const accounts = [
    { code: '1000', name: 'Cash', type: 'ASSET' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '3000', name: 'Equity', type: 'EQUITY' },
    { code: '4000', name: 'Revenue', type: 'INCOME' },
    { code: '5000', name: 'Expenses', type: 'EXPENSE' },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: acc.code } },
      update: {},
      create: { tenantId, code: acc.code, name: acc.name, type: acc.type as any, currency },
    });
  }
}

async function main() {
  console.log("🌱 Starting seed...");

  // create tenant (example: real tenant id from your app)
  const tenant = await prisma.tenant.upsert({
    where: { id: "cmfkwc9xv000496hgyhf06ro7" }, // 👈 match API tenant
    update: {},
    create: { id: "cmfkwc9xv000496hgyhf06ro7", name: "Main Tenant", country: "PK", currency: "PKR" },
  });

  await ensureSystemAccounts(tenant.id, tenant.currency);

  console.log("✅ Accounts ready for tenant:", tenant.id);
}

main().finally(() => prisma.$disconnect());
