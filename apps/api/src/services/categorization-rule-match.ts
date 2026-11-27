// Pure matching for categorization rules. No database access, so the same
// rule means the same thing in the import pipeline, the preview and the
// apply-to-existing pass, and the matching can be tested without Postgres.

export interface RuleCriteria {
  merchantPattern: string | null;
  descriptionPattern: string | null;
  amountMin: number | null;
  amountMax: number | null;
  accountId: string | null;
}

export interface RuleMatchInput {
  merchant: string | null;
  description: string;
  /** Stored magnitude, in the transaction's own currency. */
  amount: number | null;
  accountId: string | null;
}

/** Trims a pattern and turns blank into null, so "  " never matches everything. */
export function normalizePattern(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Returns why the criteria cannot form a usable rule, or null when they can. */
export function criteriaProblem(criteria: RuleCriteria): string | null {
  const hasCriterion =
    criteria.merchantPattern !== null ||
    criteria.descriptionPattern !== null ||
    criteria.amountMin !== null ||
    criteria.amountMax !== null ||
    criteria.accountId !== null;
  if (!hasCriterion) return 'Set at least one condition';
  if (criteria.amountMin !== null && criteria.amountMax !== null && criteria.amountMin > criteria.amountMax) {
    return 'Minimum amount is greater than maximum amount';
  }
  return null;
}

/**
 * True when every criterion that is set matches (AND). Pattern matching is a
 * case-insensitive substring test over "merchant description", the same text
 * the keyword pipeline reads. Amount bounds are inclusive.
 */
export function ruleMatches(criteria: RuleCriteria, txn: RuleMatchInput): boolean {
  if (criteriaProblem(criteria)) return false;
  const text = `${txn.merchant ?? ''} ${txn.description}`.toLowerCase();
  if (criteria.merchantPattern !== null && !text.includes(criteria.merchantPattern.toLowerCase())) return false;
  if (criteria.descriptionPattern !== null && !text.includes(criteria.descriptionPattern.toLowerCase())) return false;
  if (criteria.amountMin !== null && (txn.amount === null || txn.amount < criteria.amountMin)) return false;
  if (criteria.amountMax !== null && (txn.amount === null || txn.amount > criteria.amountMax)) return false;
  if (criteria.accountId !== null && txn.accountId !== criteria.accountId) return false;
  return true;
}

/**
 * The first rule that matches, given rules already in precedence order
 * (highest priority first, then oldest). Callers sort; this does not.
 */
export function firstMatchingRule<T extends RuleCriteria>(rules: readonly T[], txn: RuleMatchInput): T | null {
  for (const rule of rules) {
    if (ruleMatches(rule, txn)) return rule;
  }
  return null;
}
