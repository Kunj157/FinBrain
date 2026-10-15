import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Scene3D } from '@/components/three/scene';

function AuthPoster() {
  return (
    <div aria-hidden className="absolute inset-0">
      <span className="absolute left-[15%] top-[20%] h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
      <span className="absolute bottom-[15%] right-[10%] h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
    </div>
  );
}

const points = [
  'Every transaction categorized automatically',
  'Budgets, goals and forecasts in one place',
  'An advisor that answers from your own numbers',
];

/**
 * Split layout for sign-in and sign-up: the form on the left, and a brand
 * panel with a slow 3D backdrop on large screens.
 */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.1fr]">
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        <div aria-hidden className="app-backdrop !absolute lg:hidden" />
        <a href="/" className="relative w-fit" aria-label="FinBrain home">
          <Logo />
        </a>
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-xs text-muted-foreground">{footer}</div>}
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l bg-gradient-to-br from-primary/10 via-background to-accent/10 lg:block">
        <Scene3D load={() => import('@/components/three/auth-scene')} poster={<AuthPoster />} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-12 bottom-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AI finance co-pilot</p>
          <p className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Clarity over your money, <span className="text-gradient">without the spreadsheet.</span>
          </p>
          <ul className="mt-6 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Shared field styling for the auth forms. */
export const authInput =
  'h-11 w-full rounded-xl border border-input bg-surface-sunken/60 px-4 text-sm text-foreground shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.06)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15';
