export interface MixSegment {
  id: string;
  name: string;
  amount: number;
  /** 0..1 share of all spending. */
  share: number;
  /** A CSS colour: the category's own, or a palette slot. */
  color: string;
}

/** Hex fallbacks in the validated chart palette order, for categories without a colour. */
const FALLBACK = ['#199e70', '#9085e9', '#d95926', '#3987e5', '#c98500', '#d55181', '#008300', '#e66767'];
const OTHER = '#6b7280';

/**
 * Expense totals per category, largest first. Beyond `max` slices the rest
 * fold into one "Other" slice so the ring never needs a generated colour.
 */
export function spendingMix(
  transactions: { type: string; amount: number; categoryId: string }[],
  categories: { id: string; name: string; color?: string | null }[],
  max = 6,
): MixSegment[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + Math.abs(t.amount));
  }
  const total = [...totals.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return [];
  const sorted = [...totals.entries()].sort(([, a], [, b]) => b - a);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);
  const segments = head.map(([id, amount], i) => ({
    id,
    name: byId.get(id)?.name ?? 'Other',
    amount,
    share: amount / total,
    color: byId.get(id)?.color || FALLBACK[i % FALLBACK.length],
  }));
  if (tail.length) {
    const amount = tail.reduce((s, [, v]) => s + v, 0);
    segments.push({ id: 'other', name: 'Everything else', amount, share: amount / total, color: OTHER });
  }
  return segments;
}
