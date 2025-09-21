import { RuleResult } from './types';

export function runRbi(question: string): RuleResult {
  const q = question.toLowerCase();

  // very basic stub logic; expand later
  if (q.includes('outward remittance') || q.includes('remit abroad') || q.includes('lrs')) {
    return {
      answer: '⚠️ RBI LRS: Annual limit typically USD 250,000 per individual per FY; ensure purpose code + KYC.',
      flagged: true,
      explanation:
        'Your query suggests outward remittance. Under RBI’s Liberalised Remittance Scheme (LRS), there are annual caps and documentation requirements (purpose code, KYC). Exceeding or misclassifying can trigger compliance review.',
    };
  }

  return {
    answer: '✅ No RBI LRS red flags detected in this query.',
    flagged: false,
    explanation:
      'Based on the text, we did not detect LRS or outward remittance triggers. If you are sending funds abroad, confirm LRS limits and purpose codes.',
  };
}
