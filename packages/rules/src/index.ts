import jsonLogic from 'json-logic-js';

export type TxContext = {
  description?: string;
  amount: number;
  currency: string;
  date: string; // ISO
  reference?: string | null;
  source: string;
};

export type ThenAction = {
  category?: string; // e.g. Expense:Travel
  tax?: string;
  debitAccountCode?: string;
  creditAccountCode?: string;
};

export function evaluateRule(whenExpr: any, context: TxContext): boolean {
  return !!jsonLogic.apply(whenExpr, context);
}

export function applyRules(rules: Array<{whenExpr: any; thenAction: ThenAction; priority: number}>, ctx: TxContext) {
  // deterministic: sort by priority asc then first match wins
  const sorted = rules.filter(r => r).sort((a,b)=>a.priority-b.priority);
  for (const r of sorted) {
    if (evaluateRule(r.whenExpr, ctx)) return r.thenAction;
  }
  return null;
}
