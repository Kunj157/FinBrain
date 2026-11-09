// Pure form logic for the rule dialog. Kept apart from the component so the
// component file exports only components.

/** Form state. Amounts stay as typed text until they are sent. */
export interface RuleFormValues {
  merchantPattern: string;
  descriptionPattern: string;
  amountMin: string;
  amountMax: string;
  accountId: string;
  categoryId: string;
}

export const EMPTY_RULE_FORM: RuleFormValues = {
  merchantPattern: '',
  descriptionPattern: '',
  amountMin: '',
  amountMax: '',
  accountId: '',
  categoryId: '',
};

/** Blank is no bound; anything else must be a non-negative number. */
function parseBound(text: string): number | null | 'invalid' {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : 'invalid';
}

/** The criteria part of the form, as the API takes it. Null when a bound is invalid. */
export function criteriaFromForm(form: RuleFormValues) {
  const min = parseBound(form.amountMin);
  const max = parseBound(form.amountMax);
  if (min === 'invalid' || max === 'invalid') return null;
  return {
    merchantPattern: form.merchantPattern.trim() || null,
    descriptionPattern: form.descriptionPattern.trim() || null,
    amountMin: min,
    amountMax: max,
    accountId: form.accountId || null,
  };
}

/** Why the form cannot be saved yet, or null. The API still makes the final check. */
export function ruleFormProblem(form: RuleFormValues): string | null {
  const criteria = criteriaFromForm(form);
  if (!criteria) return 'Amounts must be numbers, zero or more';
  const hasCondition =
    criteria.merchantPattern !== null ||
    criteria.descriptionPattern !== null ||
    criteria.amountMin !== null ||
    criteria.amountMax !== null ||
    criteria.accountId !== null;
  if (!hasCondition) return 'Set at least one condition';
  if (criteria.amountMin !== null && criteria.amountMax !== null && criteria.amountMin > criteria.amountMax) {
    return 'Minimum amount is greater than maximum amount';
  }
  if (!form.categoryId) return 'Choose a category';
  return null;
}
