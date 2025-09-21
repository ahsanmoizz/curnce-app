import { RuleResult } from './types';

export function runCustom(question: string): RuleResult {
  return {
    answer: 'ℹ️ Advisory: No specific RBI/FEMA/GST/TDS rule detected. Treat as general guidance.',
    flagged: false,
    explanation:
      'This question does not map to a predefined rule pack. Add organization policies or consult a compliance expert for tailored guidance.',
  };
}
