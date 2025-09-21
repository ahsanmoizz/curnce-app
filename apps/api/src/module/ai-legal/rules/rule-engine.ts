// apps/api/src/module/ai-legal/rules/rule-engine.ts

import { RulePack, RuleEvaluation } from '../ai-legal.types';
import { LegalCategory, RuleResult } from './types';
import { runRbi } from './rbi.rules';
import { runFema } from './fema.rules';
import { runGst } from './gst.rules';
import { runTds } from './tds.rules';
import { runCustom } from './custom.rules';

export class RuleEngine {
  constructor(private packs: RulePack[] = []) {}

  /**
   * High-level runner: picks rule set by category (RBI/FEMA/GST/TDS/Custom).
   */
  run(question: string, category: string | undefined): RuleResult {
    const cat = (category || 'Custom').toUpperCase() as LegalCategory;

    switch (cat) {
      case 'RBI':
        return runRbi(question);
      case 'FEMA':
        return runFema(question);
      case 'GST':
        return runGst(question);
      case 'TDS':
        return runTds(question);
      case 'CUSTOM':
      default:
        return runCustom(question);
    }
  }

  /**
   * Lower-level evaluator: iterates through provided RulePacks.
   */
  async execute(query: string): Promise<RuleEvaluation[]> {
    const results: RuleEvaluation[] = [];

    for (const pack of this.packs) {
      for (const rule of pack.rules) {
        const triggered = query.includes(rule.id) || false;

        results.push({
          id: rule.id,
          description: rule.description,
          action: rule.action,
          severity: rule.severity,
          passed: !triggered,
          triggered,
          notes: rule.notes,
          pack: pack.name,
        });
      }
    }

    return results;
  }
}
