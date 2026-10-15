import { describe, expect, it } from 'vitest';
import { goalRings, overallProgress, RING_COLORS } from './goal-rings-model';

describe('goalRings', () => {
  it('nests up to four rings, outermost first, with clamped progress', () => {
    const rings = goalRings(
      [
        { id: 'a', name: 'A', progress: 150 },
        { id: 'b', name: 'B', progress: 40 },
        { id: 'c', name: 'C', progress: -5 },
        { id: 'd', name: 'D', progress: 10 },
        { id: 'e', name: 'E', progress: 90 },
      ],
      2,
      0.5,
    );
    expect(rings).toHaveLength(RING_COLORS.length);
    expect(rings.map((r) => r.radius)).toEqual([2, 1.5, 1, 0.5]);
    expect(rings.map((r) => r.progress)).toEqual([1, 0.4, 0, 0.1]);
  });
});

describe('overallProgress', () => {
  it('weights by target and caps each goal at its target', () => {
    expect(
      overallProgress([
        { currentAmount: 200, targetAmount: 100 },
        { currentAmount: 0, targetAmount: 100 },
      ]),
    ).toBe(50);
    expect(overallProgress([])).toBe(0);
  });
});
