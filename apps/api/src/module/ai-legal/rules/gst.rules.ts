import { RuleResult } from './types';

export function runGst(question: string): RuleResult {
  const q = question.toLowerCase();

  if (q.includes('gst') || q.includes('goods and services tax') || q.includes('input credit')) {
    return {
      answer: '⚠️ GST: Classification, place-of-supply, and ITC eligibility may apply.',
      flagged: true,
      explanation:
        'Your query indicates GST implications. Verify HSN/SAC, place-of-supply, and whether ITC is available. Filing timelines and e-invoice rules may also apply.',
    };
  }

  return {
    answer: '✅ No immediate GST obligations detected from the question.',
    flagged: false,
    explanation:
      'If the transaction involves taxable supplies or cross-state supply, GST may apply. Provide invoice details for precise guidance.',
  };
}
