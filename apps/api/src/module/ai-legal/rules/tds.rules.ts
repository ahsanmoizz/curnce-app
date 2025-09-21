import { RuleResult } from './types';

export function runTds(question: string): RuleResult {
  const q = question.toLowerCase();

  if (q.includes('tds') || q.includes('withholding') || q.includes('section 194')) {
    return {
      answer: '⚠️ TDS: Withholding may be required based on payee, nature of payment, and thresholds.',
      flagged: true,
      explanation:
        'Text suggests TDS applicability. Determine relevant section (e.g., 194C/194J/194Q), thresholds, and obtain PAN/TRC as applicable.',
    };
  }

  return {
    answer: '✅ No TDS red flags detected from the question.',
    flagged: false,
    explanation:
      'If paying for professional/contract services or crossing thresholds, TDS may apply. Provide section-specific context for precision.',
  };
}
