"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCreateSchema = exports.EntrySchema = exports.AccountCreateSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
exports.RegisterSchema = zod_1.z.object({
    tenantName: zod_1.z.string().min(2),
    country: zod_1.z.string().length(2),
    currency: zod_1.z.string().length(3),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1),
    password: zod_1.z.string().min(6)
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
exports.AccountCreateSchema = zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
    currency: zod_1.z.string().length(3)
});
exports.EntrySchema = zod_1.z.object({
    accountCode: zod_1.z.string(),
    debit: zod_1.z.number().nonnegative(),
    credit: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string().length(3)
});
exports.TransactionCreateSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    branchId: zod_1.z.string().optional(),
    externalId: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    source: zod_1.z.string(),
    occurredAt: zod_1.z.coerce.date(),
    entries: zod_1.z.array(exports.EntrySchema).min(2)
});
