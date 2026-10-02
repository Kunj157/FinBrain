import { Brain, ArrowRight, TrendingUp, PiggyBank, Repeat, Zap, BarChart3, Github, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Categorization',
    description: 'Our transformer model auto-categorizes transactions in 10+ languages with 86.5% accuracy. Say goodbye to manual tagging.',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    icon: PiggyBank,
    title: 'Smart Budgets',
    description: 'Set spending limits per category, track progress in real-time, and get alerts before you overspend.',
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Net Worth Tracking',
    description: 'Watch your wealth grow over time. Track balances across all accounts and see your complete financial picture.',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Repeat,
    title: 'Recurring Detection',
    description: 'Automatically detect subscriptions and recurring bills. Never miss a payment or forget about a subscription.',
    gradient: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-400',
  },
];

const stats = [
  { value: '86.5%', label: 'Categorization Accuracy' },
  { value: '10+', label: 'Spending Categories' },
  { value: '4', label: 'Languages Supported' },
  { value: '<1s', label: 'Prediction Speed' },
];

const steps = [
  { step: '1', title: 'Connect Your Accounts', description: 'Import transactions via CSV, PDF, or Plaid bank connection.' },
  { step: '2', title: 'AI Does the Work', description: 'Our model automatically categorizes and analyzes every transaction.' },
  { step: '3', title: 'Take Control', description: 'Set budgets, track goals, and make smarter financial decisions.' },
];

export default function HomePage() {
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) return null;
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Brain className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-gradient">Fin</span>
              <span className="text-foreground">Brain</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </a>
            <a href="/sign-up">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Get Started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 mb-8">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">AI-Powered Finance Tracking</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Your money,{' '}
            <span className="text-gradient">beautifully organized.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Track spending, budgets, and net worth — all in one place. FinBrain uses AI to
            automatically categorize transactions and give you insights that actually matter.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/sign-up">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base">
                Get Started — It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base border-white/[0.08] hover:bg-white/[0.03]">
                See Features
              </Button>
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">No credit card required. Set up in 2 minutes.</p>
        </div>
      </section>

      {/* Dashboard Mockup */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <div className="relative rounded-2xl border border-white/[0.06] bg-card/50 p-1 shadow-2xl shadow-emerald-500/5">
          <div className="rounded-xl border border-white/[0.04] bg-background/80 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted-foreground">Dashboard</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Balance', value: '$24,832', change: '+12.4%' },
                { label: 'Income', value: '$8,240', change: '+8.2%' },
                { label: 'Expenses', value: '$5,891', change: '-3.1%' },
                { label: 'Savings', value: '$2,349', change: '+22.7%' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-semibold mt-1">{item.value}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">{item.change}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-32 rounded-lg border border-white/[0.04] bg-white/[0.01] flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground/30">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Income vs Expenses Chart</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.04] bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient">{stat.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to{' '}
            <span className="text-gradient">take control.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to give you clarity over your finances.
          </p>
        </div>

        <div className="space-y-16">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex flex-col md:flex-row items-center gap-12 ${
                i % 2 !== 0 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1 space-y-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} border border-white/[0.06]`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl border border-white/[0.06] bg-card/50 p-6 h-48 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-muted-foreground/30">
                    <feature.icon className="h-8 w-8" />
                    <span className="text-sm">{feature.title}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-white/[0.04] bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Up and running in{' '}
              <span className="text-gradient">minutes.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to financial clarity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <span className="text-xl font-bold text-emerald-400">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <Brain className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Take control of your{' '}
            <span className="text-gradient">finances today.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Join FinBrain and start making smarter financial decisions with AI-powered insights.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/sign-up">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base">
                Get Started — It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold">
                <span className="text-gradient">Fin</span>
                <span className="text-foreground">Brain</span>
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="/sign-in" className="hover:text-foreground transition-colors">Sign In</a>
            </div>

            <div className="flex items-center gap-3">
              <a href="https://github.com/Kunj157/FinBrain" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FinBrain. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
