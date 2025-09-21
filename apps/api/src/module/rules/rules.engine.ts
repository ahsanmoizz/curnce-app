export function applyRules(rules: any[], ctx: any) {
  for (const rule of rules) {
    if (!rule.enabled) continue;

    const when = rule.whenExpr || {};
    let matched = true;

    if (when.descriptionContains) {
      matched =
        ctx.description?.toLowerCase().includes(
          when.descriptionContains.toLowerCase()
        ) || false;
    }
    if (when.minAmount && ctx.amount < when.minAmount) matched = false;
    if (when.maxAmount && ctx.amount > when.maxAmount) matched = false;
    if (when.currency && ctx.currency !== when.currency) matched = false;

    if (matched) {
      return rule.thenAction || {};
    }
  }
  return null;
}
