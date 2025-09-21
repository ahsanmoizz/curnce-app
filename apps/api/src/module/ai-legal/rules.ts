// apps/api/src/module/ai-legal/rules.ts
import { RulePack } from './ai-legal.types';

// Import all rule runners
import { runRbi } from './rules/rbi.rules';
import { runFema } from './rules/fema.rules';
import { runGst } from './rules/gst.rules';
import { runTds } from './rules/tds.rules';
import { runCustom } from './rules/custom.rules';

// Centralized default rule packs (structured metadata)
export const defaultRulePacks: RulePack[] = [
  {
    version: 1,
    namespace: 'rbi',
    name: 'RBI Remittance Rules',
    rules: [
      {
        id: 'rbi-lrs',
        description: 'Check outward remittance under RBI LRS',
        severity: 'high',
        action: 'review',
        notes: 'RBI LRS limits, purpose codes, and KYC requirements apply.',
      },
    ],
  },
  {
    version: 1,
    namespace: 'fema',
    name: 'FEMA Compliance',
    rules: [
      {
        id: 'fema-foreign-remittance',
        description: 'Check for foreign remittance compliance under FEMA',
        severity: 'high',
        action: 'review',
        notes: 'Form 15CA/CB and AD bank review may be required.',
      },
    ],
  },
  {
    version: 1,
    namespace: 'gst',
    name: 'GST Obligations',
    rules: [
      {
        id: 'gst-tax-liability',
        description: 'Detect GST applicability for goods/services transactions',
        severity: 'medium',
        action: 'review',
        notes: 'HSN/SAC, place-of-supply, ITC eligibility.',
      },
    ],
  },
  {
    version: 1,
    namespace: 'tds',
    name: 'TDS Withholding Rules',
    rules: [
      {
        id: 'tds-deduction',
        description: 'Check TDS applicability on payments',
        severity: 'medium',
        action: 'review',
        notes: 'Thresholds & section-specific rules (194C/194J/194Q).',
      },
    ],
  },
  {
    version: 1,
    namespace: 'custom',
    name: 'Custom Advisory',
    rules: [
      {
        id: 'custom-general',
        description: 'Fallback general advisory',
        severity: 'low',
        action: 'pass',
        notes: 'Covers cases not mapped to RBI/FEMA/GST/TDS.',
      },
    ],
  },
];

// Export raw runners if needed elsewhere
export { runRbi, runFema, runGst, runTds, runCustom };
