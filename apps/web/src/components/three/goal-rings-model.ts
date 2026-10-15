/** Vivid ring hues, fixed so they read on both themes. */
export const RING_COLORS = ['#2fc48e', '#8f80ff', '#4aa3ff', '#f2b33d'];

export interface RingSpec {
  id: string;
  name: string;
  /** 0..1 share of the ring that is filled. */
  progress: number;
  radius: number;
  color: string;
}

/**
 * Lay goals out as concentric rings, largest first: at most four, each
 * filled to its progress (clamped to 0..1), outer ring for the first goal.
 */
export function goalRings(
  goals: { id: string; name: string; progress: number }[],
  outer = 1.7,
  step = 0.3,
): RingSpec[] {
  return goals.slice(0, RING_COLORS.length).map((goal, i) => ({
    id: goal.id,
    name: goal.name,
    progress: Math.min(Math.max(goal.progress / 100, 0), 1),
    radius: outer - i * step,
    color: RING_COLORS[i],
  }));
}

/** Overall completion across goals, weighted by target, as a 0..100 percentage. */
export function overallProgress(goals: { currentAmount: number; targetAmount: number }[]): number {
  const target = goals.reduce((s, g) => s + g.targetAmount, 0);
  if (target <= 0) return 0;
  const saved = goals.reduce((s, g) => s + Math.min(g.currentAmount, g.targetAmount), 0);
  return (saved / target) * 100;
}
