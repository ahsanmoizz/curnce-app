import { RuleResult } from './types';

export function runFema(question: string): RuleResult {
  const q = question.toLowerCase();

  if (q.includes('foreign payment') || q.includes('usd transfer') || q.includes('import payment')) {
    return {
      answer: '⚠️ FEMA: Certain foreign remittances may require Form 15CA/CB and AD bank review.',
      flagged: true,
      explanation:
        'Foreign remittances can trigger FEMA reporting and tax certifications (e.g., Form 15CA/CB). Work with your AD bank and CA to ensure proper classification and filings.',
    };
  }

  return {
    answer: '✅ No FEMA red flags detected for this query.',
    flagged: false,
    explanation:
      'We did not detect FEMA triggers. If remittance involves services/imports, verify if 15CA/CB is required.',
  };
}
