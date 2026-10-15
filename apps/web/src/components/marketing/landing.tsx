import {
  ArrowRight,
  BarChart3,
  Brain,
  Github,
  LineChart,
  Lock,
  PiggyBank,
  Repeat,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Eye,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { Scene3D } from '@/components/three/scene';
import { HeroPoster } from '@/components/three/hero-poster';
import { InView } from '@/components/motion/in-view';
import { Spotlight } from '@/components/motion/spotlight';
import { TiltCard } from '@/components/motion/tilt-card';
import { BorderTrail } from '@/components/motion/border-trail';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { cn } from '@/lib/utils';

export const REPO_URL = 'https://github.com/Kunj157/FinBrain';

export interface LandingLink {
  label: string;
  href: string;
}

export interface LandingProps {
  /** The main call to action (sign up in the app, the repository on the marketing site). */
  primary: LandingLink;
  /** Optional link in the nav, e.g. Sign in inside the app. */
  navLink?: LandingLink;
  /** Product screenshots; without them a live mock of the dashboard renders. */
  shots?: { dashboard?: string; advisor?: string; analytics?: string; transactions?: string };
}

const features: { icon: LucideIcon; title: string; body: string; tone: string; shot?: 'transactions' | 'analytics' }[] = [
  {
    icon: Brain,
    title: 'AI-powered categorization',
    body: 'A transformer model sorts transactions in 10+ languages with 86.5% accuracy, with a keyword fallback when it is unsure.',
    tone: 'text-primary bg-primary/10 ring-primary/20',
    shot: 'transactions',
  },
  {
    icon: PiggyBank,
    title: 'Adaptive budgets',
    body: 'Limits per category, alerts at 75, 90 and 100 percent, rollover, and flexible buckets for irregular bills.',
    tone: 'text-warning bg-warning/10 ring-warning/20',
  },
  {
    icon: LineChart,
    title: 'Forecasts and analytics',
    body: 'Prophet, ARIMA and regression forecasts, money-flow Sankey diagrams, and reports you can export.',
    tone: 'text-info bg-info/10 ring-info/20',
    shot: 'analytics',
  },
  {
    icon: Repeat,
    title: 'Recurring detection',
    body: 'Subscriptions and bills are found automatically and laid out on a calendar with reminders.',
    tone: 'text-accent bg-accent/10 ring-accent/20',
  },
  {
    icon: ScanLine,
    title: 'Imports that just work',
    body: 'Plaid bank sync, CSV, German bank PDF statements, and receipt OCR.',
    tone: 'text-positive bg-positive/10 ring-positive/20',
  },
  {
    icon: BarChart3,
    title: 'Seven currencies',
    body: 'Every total converts properly instead of adding rupees to dollars.',
    tone: 'text-negative bg-negative/10 ring-negative/20',
  },
];

const stack = [
  { group: 'Web', items: ['React 19', 'Vite', 'Tailwind CSS', 'Radix UI', 'Motion', 'three.js', 'Chart.js'] },
  { group: 'API', items: ['Express', 'Prisma', 'PostgreSQL', 'Zod', 'Clerk'] },
  { group: 'Intelligence', items: ['FastAPI', 'XLM-RoBERTa', 'Prophet', 'Groq / OpenAI', 'Tesseract OCR'] },
  { group: 'Quality', items: ['Vitest', 'Playwright', 'GitHub Actions', 'Docker'] },
];

function Section({ id, eyebrow, title, lead, children, className }: { id?: string; eyebrow: string; title: ReactNode; lead?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('mx-auto max-w-6xl scroll-mt-20 px-6 py-20 md:py-28', className)}>
      <InView className="mx-auto mb-14 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-[2.6rem] md:leading-[1.1]">{title}</h2>
        {lead && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{lead}</p>}
      </InView>
      {children}
    </section>
  );
}

/** A browser-window frame for screenshots and mocks. */
function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-float">
      <div className="flex items-center gap-1.5 border-b bg-foreground/[0.02] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-negative/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-positive/60" />
        <span className="ml-3 text-[11px] text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function DashboardMock() {
  const cards = [
    { label: 'Balance', value: 24832, delta: '+12.4%' },
    { label: 'Income', value: 8240, delta: '+8.2%' },
    { label: 'Spending', value: 5891, delta: '-3.1%' },
    { label: 'Saved', value: 2349, delta: '+22.7%' },
  ];
  const bars = [38, 52, 44, 61, 57, 72, 66, 84];
  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-background/60 p-4 shadow-edge">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{c.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight">
              <AnimatedNumber value={c.value} from={0} format={money} />
            </p>
            <p className="mt-0.5 text-xs text-positive">{c.delta}</p>
          </div>
        ))}
      </div>
      <div className="flex h-36 items-end gap-2 rounded-xl border bg-background/60 p-4">
        {bars.map((h, i) => (
          <InView key={i} index={i} className="flex h-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
          </InView>
        ))}
      </div>
    </div>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full" />;
}

export function Landing({ primary, navLink, shots }: LandingProps) {
  const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#advisor" className="transition-colors hover:text-foreground">Advisor</a>
            <a href="#security" className="transition-colors hover:text-foreground">Security</a>
            <a href="#stack" className="transition-colors hover:text-foreground">Stack</a>
          </div>
          <div className="flex items-center gap-2">
            {navLink && (
              <a href={navLink.href} {...external(navLink.href)}>
                <Button variant="ghost" size="sm">{navLink.label}</Button>
              </a>
            )}
            <a href={primary.href} {...external(primary.href)}>
              <Button size="sm">
                {primary.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="app-backdrop !absolute" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 pb-12 pt-16 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-xs font-medium text-primary">AI-powered personal finance</span>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.04] tracking-tight md:text-6xl">
              Your money,{' '}
              <span className="text-gradient">beautifully organized.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              FinBrain categorizes every transaction, keeps budgets honest, forecasts where you are
              heading, and answers money questions from your own numbers.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a href={primary.href} {...external(primary.href)}>
                <Button size="lg">
                  {primary.label}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <a href="#features">
                <Button variant="outline" size="lg">See features</Button>
              </a>
            </div>
          </div>
          <Scene3D
            load={() => import('@/components/three/hero-scene')}
            poster={<HeroPoster />}
            className="h-[340px] w-full md:h-[440px]"
          />
        </div>

        <InView className="relative mx-auto max-w-5xl px-6 pb-8">
          <span aria-hidden className="absolute inset-x-20 -top-6 -z-10 h-40 rounded-full bg-primary/20 blur-3xl" />
          <TiltCard max={3} className="rounded-2xl">
            <Frame label="Dashboard">
              {shots?.dashboard ? <Shot src={shots.dashboard} alt="The FinBrain dashboard" /> : <DashboardMock />}
            </Frame>
          </TiltCard>
        </InView>
      </section>

      {/* Numbers */}
      <section className="border-y bg-foreground/[0.015]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
          {[
            { value: 86.5, format: (n: number) => `${n.toFixed(1)}%`, label: 'Categorization accuracy' },
            { value: 7, format: (n: number) => `${Math.round(n)}`, label: 'Currencies converted' },
            { value: 4, format: (n: number) => `${Math.round(n)}`, label: 'Forecasting models' },
            { value: 40, format: (n: number) => `${Math.round(n)}+`, label: 'Features shipped' },
          ].map((s, i) => (
            <InView key={s.label} index={i} className="text-center">
              <p className="text-3xl font-semibold tracking-tight text-gradient md:text-4xl">
                <AnimatedNumber value={s.value} from={0} format={s.format} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </InView>
          ))}
        </div>
      </section>

      <Section id="features" eyebrow="Features" title={<>Everything you need to <span className="text-gradient">take control.</span></>} lead="One place for every account, every budget and every question about your money.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <InView key={f.title} index={i} className={cn(f.shot && shots?.[f.shot] && 'lg:col-span-2')}>
              <Spotlight className="h-full rounded-2xl">
                <div className="stat-card h-full rounded-2xl p-6">
                  <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset', f.tone)}>
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  {f.shot && shots?.[f.shot] && (
                    <div className="mt-5 overflow-hidden rounded-xl border">
                      <Shot src={shots[f.shot]!} alt={`${f.title} in FinBrain`} />
                    </div>
                  )}
                </div>
              </Spotlight>
            </InView>
          ))}
        </div>
      </Section>

      <Section id="advisor" eyebrow="AI advisor" title={<>Ask anything. Get answers <span className="text-gradient">from your numbers.</span></>} lead="The advisor reasons over your real income, spending and goals, and checks affordability with a deterministic engine instead of guessing.">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <InView className="space-y-4">
            {[
              { q: 'Can I afford a $1,200 laptop this month?', a: 'Yes, comfortably. After your usual spending you keep about $1,860 this month, so the laptop leaves a $660 buffer.' },
              { q: 'Where did my money go in September?', a: 'Housing was 41% of spending, then shopping at 18%. Shopping is up 23% on August.' },
            ].map((turn) => (
              <div key={turn.q} className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm">{turn.q}</div>
                <div className="relative max-w-[90%] rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm shadow-edge">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden />FinBrain</p>
                  {turn.a}
                </div>
              </div>
            ))}
            <div className="relative overflow-hidden rounded-2xl border bg-card px-4 py-3 text-sm">
              <BorderTrail tone="accent" size={90} />
              <TextShimmer>Thinking through your last 90 days…</TextShimmer>
            </div>
          </InView>
          <InView index={1}>
            {shots?.advisor ? (
              <TiltCard max={3} className="rounded-2xl"><Frame label="Advisor"><Shot src={shots.advisor} alt="The FinBrain advisor" /></Frame></TiltCard>
            ) : (
              <ul className="space-y-3">
                {['Multi-turn memory of your goals and constraints', 'Scenario simulator: what if rent goes up 20%?', 'Confidence shown with every answer', 'Groq or OpenAI, your choice'].map((item) => (
                  <li key={item} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-edge">
                    <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden />{item}
                  </li>
                ))}
              </ul>
            )}
          </InView>
        </div>
      </Section>

      <Section id="security" eyebrow="Security and privacy" title={<>Your data stays <span className="text-gradient">yours.</span></>} className="pt-0 md:pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Lock, title: 'Encrypted credentials', body: 'Bank tokens are encrypted at rest with a key only your deployment holds.' },
            { icon: Eye, title: 'Read-only access', body: 'Bank connections can read balances and transactions, never move money.' },
            { icon: ShieldCheck, title: 'Self-hostable', body: 'Run the whole stack with Docker Compose on your own machine or cloud.' },
          ].map((item, i) => (
            <InView key={item.title} index={i}>
              <div className="stat-card h-full rounded-2xl p-6">
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </InView>
          ))}
        </div>
      </Section>

      <Section id="stack" eyebrow="Tech stack" title="Built with a modern, typed stack" className="pt-0 md:pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stack.map((col, i) => (
            <InView key={col.group} index={i}>
              <div className="stat-card h-full rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{col.group}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {col.items.map((item) => (
                    <span key={item} className="rounded-full border bg-background/60 px-2.5 py-1 text-xs font-medium">{item}</span>
                  ))}
                </div>
              </div>
            </InView>
          ))}
        </div>
      </Section>

      {/* Call to action */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <InView>
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-accent/15 px-6 py-16 text-center shadow-float">
            <BorderTrail size={140} seconds={6} />
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Open source, end to end.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Read the code, run it locally in minutes, or deploy it for yourself.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg"><Github className="h-5 w-5" />Star on GitHub</Button>
              </a>
              {primary.href !== REPO_URL && (
                <a href={primary.href}>
                  <Button size="lg" variant="outline">{primary.label}</Button>
                </a>
              )}
            </div>
          </div>
        </InView>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <Logo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#advisor" className="hover:text-foreground">Advisor</a>
            <a href="#security" className="hover:text-foreground">Security</a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground"><Github className="h-4 w-4" aria-hidden />GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FinBrain. MIT licensed.</p>
        </div>
      </footer>
    </div>
  );
}
