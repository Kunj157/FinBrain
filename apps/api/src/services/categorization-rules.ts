import { type Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { firstMatchingRule, ruleMatches, type RuleCriteria } from './categorization-rule-match';

/** Rows read per page when scanning a user's transactions. */
const PAGE_SIZE = 1000;
/** Ids per updateMany, so one apply never builds an oversized IN list. */
const UPDATE_CHUNK = 500;
export const RULE_PREVIEW_SAMPLE_SIZE = 10;

export const ruleInclude = {
  category: { select: { id: true, name: true, color: true } },
  account: { select: { id: true, name: true } },
} as const;

type RuleRow = Prisma.CategorizationRuleGetPayload<{ include: typeof ruleInclude }>;

/** A rule as the matcher sees it: criteria as plain numbers, plus its target. */
export interface RuleView extends RuleCriteria {
  id: string;
  categoryId: string;
  categoryName: string;
}

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value.toString());

export function criteriaOf(row: {
  merchantPattern: string | null;
  descriptionPattern: string | null;
  amountMin: Prisma.Decimal | null;
  amountMax: Prisma.Decimal | null;
  accountId: string | null;
}): RuleCriteria {
  return {
    merchantPattern: row.merchantPattern,
    descriptionPattern: row.descriptionPattern,
    amountMin: toNumber(row.amountMin),
    amountMax: toNumber(row.amountMax),
    accountId: row.accountId,
  };
}

/** The JSON shape the API returns for a rule: amounts as numbers, not Decimal strings. */
export function serializeRule(row: RuleRow) {
  return { ...row, ...criteriaOf(row), amountMin: toNumber(row.amountMin), amountMax: toNumber(row.amountMax) };
}

/** Rules in precedence order: highest priority first, then oldest. */
export async function loadRules(userId: string, options: { activeOnly?: boolean } = {}): Promise<RuleRow[]> {
  return prisma.categorizationRule.findMany({
    where: { userId, ...(options.activeOnly && { isActive: true }) },
    include: ruleInclude,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
}

export function toRuleView(row: RuleRow): RuleView {
  return { ...criteriaOf(row), id: row.id, categoryId: row.categoryId, categoryName: row.category.name };
}

/**
 * Returns an error message when a referenced category or account is not the
 * caller's own. Both are checked on every write, so a rule can never point at
 * another user's data.
 */
export async function checkRuleReferences(
  userId: string,
  refs: { categoryId?: string; accountId?: string | null },
): Promise<string | null> {
  if (refs.categoryId !== undefined) {
    const category = await prisma.category.findFirst({ where: { id: refs.categoryId, userId }, select: { id: true } });
    if (!category) return 'Category not found';
  }
  if (refs.accountId) {
    const account = await prisma.account.findFirst({ where: { id: refs.accountId, userId }, select: { id: true } });
    if (!account) return 'Account not found';
  }
  return null;
}

/** Calls `visit` for every page of the user's live transactions, in id order. */
async function forEachTransactionPage(
  where: Prisma.TransactionWhereInput,
  visit: (page: Awaited<ReturnType<typeof fetchPage>>) => void,
): Promise<number> {
  let scanned = 0;
  let cursor: string | undefined;
  for (;;) {
    const page = await fetchPage(where, cursor);
    if (page.length === 0) break;
    scanned += page.length;
    visit(page);
    if (page.length < PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }
  return scanned;
}

function fetchPage(where: Prisma.TransactionWhereInput, cursor: string | undefined) {
  return prisma.transaction.findMany({
    where,
    select: {
      id: true,
      date: true,
      description: true,
      merchant: true,
      amount: true,
      accountId: true,
      categoryId: true,
      category: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
}

export interface RulePreview {
  matched: number;
  scanned: number;
  sample: {
    id: string;
    date: string;
    description: string;
    merchant: string | null;
    amount: number;
    categoryName: string;
  }[];
}

/** Counts the user's live transactions that the given criteria would match. Writes nothing. */
export async function previewRule(userId: string, criteria: RuleCriteria): Promise<RulePreview> {
  const matches: Awaited<ReturnType<typeof fetchPage>> = [];
  const scanned = await forEachTransactionPage({ userId, deletedAt: null }, (page) => {
    for (const txn of page) {
      if (ruleMatches(criteria, { merchant: txn.merchant, description: txn.description, amount: Number(txn.amount.toString()), accountId: txn.accountId })) {
        matches.push(txn);
      }
    }
  });
  matches.sort((a, b) => b.date.getTime() - a.date.getTime());
  return {
    matched: matches.length,
    scanned,
    sample: matches.slice(0, RULE_PREVIEW_SAMPLE_SIZE).map((txn) => ({
      id: txn.id,
      date: txn.date.toISOString(),
      description: txn.description,
      merchant: txn.merchant,
      amount: Number(txn.amount.toString()),
      categoryName: txn.category.name,
    })),
  };
}

export interface ApplyResult {
  dryRun: boolean;
  scanned: number;
  changed: number;
  byRule: { ruleId: string; categoryName: string; count: number }[];
}

/**
 * Runs the active rules over the user's existing transactions, using the same
 * first-match order as import. Rows marked reviewed are left alone, because
 * the user has already confirmed their category. Rows already in the target
 * category are not counted. Trains nothing: rule results are not user input.
 */
export async function applyRules(userId: string, options: { dryRun: boolean }): Promise<ApplyResult> {
  const rules = (await loadRules(userId, { activeOnly: true })).map(toRuleView);
  const countByRule = new Map<string, number>();
  const moves = new Map<string, string[]>();

  const scanned = await forEachTransactionPage({ userId, deletedAt: null, reviewed: false }, (page) => {
    for (const txn of page) {
      const rule = firstMatchingRule(rules, {
        merchant: txn.merchant,
        description: txn.description,
        amount: Number(txn.amount.toString()),
        accountId: txn.accountId,
      });
      if (!rule || rule.categoryId === txn.categoryId) continue;
      countByRule.set(rule.id, (countByRule.get(rule.id) ?? 0) + 1);
      const ids = moves.get(rule.categoryId) ?? [];
      ids.push(txn.id);
      moves.set(rule.categoryId, ids);
    }
  });

  const byRule = rules
    .filter((rule) => countByRule.has(rule.id))
    .map((rule) => ({ ruleId: rule.id, categoryName: rule.categoryName, count: countByRule.get(rule.id) ?? 0 }));
  const changed = byRule.reduce((sum, rule) => sum + rule.count, 0);

  if (!options.dryRun) {
    for (const [categoryId, ids] of moves) {
      for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
        await prisma.transaction.updateMany({
          where: { userId, id: { in: ids.slice(i, i + UPDATE_CHUNK) } },
          data: { categoryId },
        });
      }
    }
    if (changed > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'apply',
          entity: 'categorization_rule',
          entityId: null,
          details: { changed, byRule } as unknown as Prisma.InputJsonValue,
          userId,
        },
      }).catch(() => {});
    }
  }

  return { dryRun: options.dryRun, scanned, changed, byRule };
}

/**
 * Sets priorities so the given order is the precedence order. The list must
 * name each of the user's rules exactly once; anything else is rejected, so a
 * stale client cannot silently drop or reorder a rule it did not see.
 */
export async function reorderRules(userId: string, orderedIds: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const owned = await prisma.categorizationRule.findMany({ where: { userId }, select: { id: true } });
  const ownedIds = new Set(owned.map((rule) => rule.id));
  const unique = new Set(orderedIds);
  const complete =
    orderedIds.length === ownedIds.size &&
    unique.size === orderedIds.length &&
    orderedIds.every((id) => ownedIds.has(id));
  if (!complete) return { ok: false, error: 'ids must list each of your rules exactly once' };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.categorizationRule.updateMany({
        where: { id, userId },
        data: { priority: orderedIds.length - index },
      }),
    ),
  );
  return { ok: true };
}
