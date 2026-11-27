import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import {
  applyRules,
  checkRuleReferences,
  criteriaOf,
  loadRules,
  previewRule,
  reorderRules,
  ruleInclude,
  serializeRule,
} from '../services/categorization-rules';
import { criteriaProblem, normalizePattern, type RuleCriteria } from '../services/categorization-rule-match';

const router = Router();

const EMPTY_CRITERIA: RuleCriteria = {
  merchantPattern: null,
  descriptionPattern: null,
  amountMin: null,
  amountMax: null,
  accountId: null,
};

const criteriaSchema = z.object({
  merchantPattern: z.string().trim().max(255).nullable().optional(),
  descriptionPattern: z.string().trim().max(255).nullable().optional(),
  amountMin: z.number().finite().nonnegative().max(1_000_000_000_000).nullable().optional(),
  amountMax: z.number().finite().nonnegative().max(1_000_000_000_000).nullable().optional(),
  accountId: z.string().min(1).nullable().optional(),
});

// Every field optional, so PUT can change one of them. Criteria that end up
// set are checked against the merged rule, not the patch alone.
const updateRuleSchema = criteriaSchema.extend({
  priority: z.number().int().optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const createRuleSchema = updateRuleSchema.extend({
  categoryId: z.string().min(1),
});

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).max(1000),
});

const applySchema = z.object({
  dryRun: z.boolean().default(false),
});

/**
 * Applies a parsed patch on top of a base set of criteria. Absent fields keep
 * the base value, null clears it, and blank patterns are treated as unset.
 */
function criteriaFrom(
  patch: z.infer<typeof criteriaSchema>,
  base: RuleCriteria,
): RuleCriteria {
  const money = (value: number | null | undefined, fallback: number | null) => {
    if (value === undefined) return fallback;
    return value === null ? null : Math.round(value * 10_000) / 10_000;
  };
  return {
    merchantPattern: patch.merchantPattern === undefined ? base.merchantPattern : normalizePattern(patch.merchantPattern),
    descriptionPattern: patch.descriptionPattern === undefined ? base.descriptionPattern : normalizePattern(patch.descriptionPattern),
    amountMin: money(patch.amountMin, base.amountMin),
    amountMax: money(patch.amountMax, base.amountMax),
    accountId: patch.accountId === undefined ? base.accountId : patch.accountId,
  };
}

router.get('/', async (req: Request, res: Response) => {
  const rules = await loadRules(req.userId);
  res.json({ success: true, data: rules.map(serializeRule) });
});

router.get('/:id', async (req: Request, res: Response) => {
  const rule = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: ruleInclude,
  });
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
  res.json({ success: true, data: serializeRule(rule) });
});

// Dry run: counts the user's existing transactions the criteria would match.
// Nothing is written. The body is criteria only, so it works before a rule is saved.
router.post('/preview', async (req: Request, res: Response) => {
  const parsed = criteriaSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }
  const criteria = criteriaFrom(parsed.data, EMPTY_CRITERIA);
  const problem = criteriaProblem(criteria);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const refError = await checkRuleReferences(req.userId, { accountId: criteria.accountId });
  if (refError) return res.status(400).json({ success: false, error: refError });

  res.json({ success: true, data: await previewRule(req.userId, criteria) });
});

// Runs the active rules over existing transactions, first match wins. Pass
// { "dryRun": true } to get the counts without writing.
router.post('/apply', async (req: Request, res: Response) => {
  const parsed = applySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }
  res.json({ success: true, data: await applyRules(req.userId, { dryRun: parsed.data.dryRun }) });
});

// The ids are the new precedence order, first = highest priority.
router.post('/reorder', async (req: Request, res: Response) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }
  const result = await reorderRules(req.userId, parsed.data.ids);
  if (!result.ok) return res.status(400).json({ success: false, error: result.error });

  const rules = await loadRules(req.userId);
  res.json({ success: true, data: rules.map(serializeRule) });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }
  const { categoryId, priority, isActive, ...patch } = parsed.data;
  const criteria = criteriaFrom(patch, EMPTY_CRITERIA);
  const problem = criteriaProblem(criteria);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const refError = await checkRuleReferences(req.userId, { categoryId, accountId: criteria.accountId });
  if (refError) return res.status(400).json({ success: false, error: refError });

  // A new rule goes to the top unless the caller sets a priority.
  let nextPriority = priority;
  if (nextPriority === undefined) {
    const top = await prisma.categorizationRule.aggregate({
      where: { userId: req.userId },
      _max: { priority: true },
    });
    nextPriority = (top._max.priority ?? -1) + 1;
  }

  const rule = await prisma.categorizationRule.create({
    data: { ...criteria, categoryId, priority: nextPriority, isActive: isActive ?? true, userId: req.userId },
    include: ruleInclude,
  });

  res.status(201).json({ success: true, data: serializeRule(rule) });
});

router.put('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: ruleInclude,
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Rule not found' });

  const parsed = updateRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }
  const { categoryId, priority, isActive, ...patch } = parsed.data;
  const criteria = criteriaFrom(patch, criteriaOf(existing));
  const problem = criteriaProblem(criteria);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const refError = await checkRuleReferences(req.userId, { categoryId, accountId: criteria.accountId });
  if (refError) return res.status(400).json({ success: false, error: refError });

  const rule = await prisma.categorizationRule.update({
    where: { id: req.params.id },
    data: {
      ...criteria,
      ...(categoryId !== undefined && { categoryId }),
      ...(priority !== undefined && { priority }),
      ...(isActive !== undefined && { isActive }),
    },
    include: ruleInclude,
  });

  res.json({ success: true, data: serializeRule(rule) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.categorizationRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ success: false, error: 'Rule not found' });

  await prisma.categorizationRule.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Rule deleted' });
});

export default router;
