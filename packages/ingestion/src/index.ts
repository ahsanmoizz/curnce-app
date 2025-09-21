import { parse } from 'csv-parse/sync';

export type BankRow = { date: string; description: string; amount: string; currency?: string; reference?: string };

export function parseBankCsv(csv: string): BankRow[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  return records.map((r: any) => ({
    date: r.date,
    description: r.description,
    amount: r.amount,
    currency: r.currency || 'INR',
    reference: r.reference || null
  }));
}
