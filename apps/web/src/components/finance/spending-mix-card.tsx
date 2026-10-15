import { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import type { Category, Transaction } from '@finbrain/shared';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Scene3D } from '@/components/three/scene';
import { SpendingMixPoster } from '@/components/three/spending-mix-poster';
import { spendingMix } from '@/components/three/spending-mix-model';
import { cn, formatCurrency } from '@/lib/utils';

const loadScene = () => import('@/components/three/spending-mix-scene');

/** Spending by category as a 3D ring beside a ranked legend; the two highlight together. */
export function SpendingMixCard({
  transactions,
  categories,
  currency,
}: {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}) {
  const segments = useMemo(() => spendingMix(transactions, categories), [transactions, categories]);
  const [hovered, setHovered] = useState<string | null>(null);
  const focus = segments.find((s) => s.id === hovered) ?? segments[0];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid items-center md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-5 p-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" aria-hidden />
              Spending mix
            </CardTitle>
            <CardDescription className="mt-1">Every category&apos;s share of what you spent</CardDescription>
          </div>
          {focus && (
            <div aria-live="polite">
              <p className="stat-label">{focus.name}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(focus.amount, currency)}
              </p>
              <p className="text-sm text-muted-foreground">{(focus.share * 100).toFixed(1)}% of spending</p>
            </div>
          )}
          <ul className="space-y-1" onMouseLeave={() => setHovered(null)}>
            {segments.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHovered(s.id)}
                  onFocus={() => setHovered(s.id)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                    hovered === s.id ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]',
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(s.share * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative h-[280px] md:h-[320px]">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_45%,hsl(var(--accent)/0.10),transparent_70%)]" />
          {segments.length > 0 ? (
            <Scene3D
              load={loadScene}
              poster={<SpendingMixPoster segments={segments} />}
              props={{ segments, hovered, onHover: setHovered }}
              className="h-full w-full"
            />
          ) : (
            <EmptyState icon={PieChart} title="No spending yet" description="Your category mix appears after your first expense." />
          )}
        </div>
      </div>
    </Card>
  );
}
