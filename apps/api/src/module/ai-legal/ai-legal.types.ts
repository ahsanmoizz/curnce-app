// apps/api/src/module/ai-legal/ai-legal.types.ts

export type RuleOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'exists'
  | 'regex';

export interface Condition {
  path: string;
  op: RuleOp;
  value?: any;
  flags?: string;
}

export interface WhenClause {
  all?: Condition[];
  any?: Condition[];
}

export interface RuleDef {
  id: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  action: 'pass' | 'review' | 'fail';
  when?: WhenClause;
  notes?: string;
}

export interface RulePack {
  version: number;
  namespace: string;
  name: string;
  defaults?: Record<string, any>;
  rules: RuleDef[];
}

export interface RuleEvaluation {
  id: string;
  description?: string;
  action: 'pass' | 'review' | 'fail';
  severity?: string;
  passed: boolean;
  triggered: boolean;
  notes?: string;
  details?: { reason?: string };

  // ✅ extra metadata allowed
  ruleId?: string;
  desc?: string;
  pack?: string;
}

export interface ComplianceDecision {
  status: 'passed' | 'failed' | 'manual_review';
  rules: RuleEvaluation[];
  notes?: string;
}
