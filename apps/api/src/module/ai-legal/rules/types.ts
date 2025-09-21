export type LegalCategory = 'RBI' | 'FEMA' | 'GST' | 'TDS' | 'CUSTOM';

export interface RuleResult {
  answer: string;
  flagged: boolean;
  explanation: string;
}
