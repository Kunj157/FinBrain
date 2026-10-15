import { describe, expect, it } from 'vitest';
import { spendingMix } from './spending-mix-model';

const cats = [
  { id: 'food', name: 'Food', color: '#ff0000' },
  { id: 'rent', name: 'Rent', color: null },
];

describe('spendingMix', () => {
  it('totals expenses per category, largest first, and ignores income', () => {
    const mix = spendingMix(
      [
        { type: 'expense', amount: 30, categoryId: 'food' },
        { type: 'expense', amount: -70, categoryId: 'rent' },
        { type: 'income', amount: 500, categoryId: 'food' },
      ],
      cats,
    );
    expect(mix.map((s) => [s.id, s.amount, s.share])).toEqual([
      ['rent', 70, 0.7],
      ['food', 30, 0.3],
    ]);
    expect(mix[1].color).toBe('#ff0000');
    expect(mix[0].color).toMatch(/^#/);
  });

  it('folds slices beyond the limit into one', () => {
    const txns = ['a', 'b', 'c'].map((id, i) => ({ type: 'expense', amount: 10 - i, categoryId: id }));
    const mix = spendingMix(txns, [], 2);
    expect(mix).toHaveLength(3);
    expect(mix[2]).toMatchObject({ id: 'other', amount: 8 });
  });

  it('is empty without spending', () => {
    expect(spendingMix([], cats)).toEqual([]);
  });
});
