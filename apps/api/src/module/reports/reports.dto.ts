// financialreports.dto.ts
import { z } from "zod";

/**
 * Close Period DTO
 */
export const ClosePeriodSchema = z.object({
  period: z.string().min(6, "Period must be YYYY-MM").regex(/^\d{4}-\d{2}$/, "Invalid period format"),
  closedBy: z.string().uuid("closedBy must be a valid UUID"),
});
export type ClosePeriodDto = z.infer<typeof ClosePeriodSchema>;

/**
 * Trial Balance DTO
 */
export const TrialBalanceSchema = z.object({
  start: z.string().optional(), // either start/end or from/to
  end: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type TrialBalanceDto = z.infer<typeof TrialBalanceSchema>;

/**
 * Ledger Report DTO
 */
export const LedgerReportSchema = z.object({
  accountId: z.string().uuid("accountId must be a valid UUID"),
  from: z.string(),
  to: z.string(),
});
export type LedgerReportDto = z.infer<typeof LedgerReportSchema>;

/**
 * Payments Report DTO
 */
export const PaymentsReportSchema = z.object({
  vendorId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  from: z.string(),
  to: z.string(),
});
export type PaymentsReportDto = z.infer<typeof PaymentsReportSchema>;

/**
 * Compliance Report DTO
 */
export const ComplianceReportSchema = z.object({
  regulation: z.string().min(3),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});
export type ComplianceReportDto = z.infer<typeof ComplianceReportSchema>;

/**
 * Generate Report DTO
 */
export const GenerateReportSchema = z.object({
  type: z.enum([
    "trial-balance",
    "income-statement",
    "balance-sheet",
    "cash-flow",
    "budget-variance",
    "ledger",
    "payments",
    "compliance",
  ]),
  params: z.record(z.any()).optional(),
});
export type GenerateReportDto = z.infer<typeof GenerateReportSchema>;
