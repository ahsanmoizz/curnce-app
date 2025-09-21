import { z } from 'zod';

export const RegisterSchema = z.object({
  tenantName: z.string().min(2),
  country: z.string().length(2),
  currency: z.string().length(3),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
});
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const AccountCreateSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.string().min(1), 
  currency: z.string().length(3)
});

export const EntrySchema = z.object({
  accountCode: z.string(),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  currency: z.string().length(3)
});
export const TransactionCreateSchema = z.object({
  tenantId: z.string(),
  branchId: z.string().optional(),
  externalId: z.string().optional(),
  description: z.string().optional(),
  source: z.string(),
  occurredAt: z.coerce.date(),
  entries: z.array(EntrySchema).min(2)
});

export type JwtUser = { userId: string; tenantId: string; role: 'OWNER'|'ADMIN'|'STAFF'|'AUDITOR' };
