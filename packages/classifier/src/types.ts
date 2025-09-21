export interface ClassifierInput {
  description: string;
  amount: number;
  currency: string;
  counterparty?: string;
  branchId?: string;
  tenantId?: string;
}

export interface ClassifierResult {
  category: string;      // e.g. "TRAVEL_EXPENSE", "INCOME_SALES"
  taxCode: string;       // e.g. "GST18", "VAT20"
  confidence: number;    // percentage (0–100)
  modelVersion: string;  // which version of the model produced this
}
