import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Tags,
  PiggyBank,
  Target,
  BarChart3,
  Receipt,
  FileText,
  Sparkles,
  Settings,
  HelpCircle,
  Building2,
  Repeat,
  Briefcase,
  TrendingUp,
  MessageSquare,
  Users,
  Activity,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
import { ActiveHighlight } from '@/components/motion/animated-background';
import { GlowEffect } from '@/components/motion/glow-effect';

type NavItem = { icon: LucideIcon; label: string; path: string; ai?: boolean };

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Building2, label: 'Accounts', path: '/accounts' },
      { icon: Briefcase, label: 'Investments', path: '/investments' },
      { icon: Users, label: 'Household', path: '/household' },
      { icon: Activity, label: 'Credit Score', path: '/credit-score' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: ArrowRightLeft, label: 'Transactions', path: '/transactions' },
      { icon: Tags, label: 'Categories', path: '/categories' },
      { icon: PiggyBank, label: 'Budgets', path: '/budgets' },
      { icon: Repeat, label: 'Recurring', path: '/recurring' },
      { icon: Target, label: 'Goals', path: '/goals' },
    ],
  },
  {
    title: 'Analyze',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: TrendingUp, label: 'Forecasting', path: '/forecasting' },
      { icon: Receipt, label: 'Receipts', path: '/receipts' },
      { icon: FileText, label: 'Reports', path: '/reports' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { icon: MessageSquare, label: 'Advisor', path: '/advisor', ai: true },
      { icon: Sparkles, label: 'AI Insights', path: '/insights', ai: true },
    ],
  },
];

const bottomItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

function SidebarLink({ item, onNavigate, edge = true }: { item: NavItem; onNavigate?: () => void; edge?: boolean }) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) => cn('nav-link group isolate', isActive && 'active')}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <ActiveHighlight
              layoutId="sidebar-active"
              className={cn(
                'rounded-lg border border-border bg-foreground/[0.06] shadow-edge',
                // The brand edge bar sits in the nav gutter, so only single-column links get it.
                edge && "before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-primary before:content-['']",
              )}
            />
          )}
          <item.icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? (item.ai ? 'text-accent' : 'text-primary') : 'group-hover:text-foreground',
            )}
            aria-hidden
          />
          <span>{item.label}</span>
          {item.ai && (
            <span className="ml-auto rounded-full border border-accent/25 bg-accent/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-accent">
              AI
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <aside className="h-full w-[248px]" aria-label="Primary">
      <div className="glass-strong flex h-full flex-col border-r">
        <div className="flex h-16 items-center px-5">
          <Logo tagline />
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-1">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-2 gap-1 border-t px-3 py-2">
          {bottomItems.map((item) => (
            <SidebarLink key={item.path} item={item} onNavigate={onNavigate} edge={false} />
          ))}
        </div>

        {pathname !== '/advisor' && (
          <div className="mx-3 mb-3">
            <NavLink
              to="/advisor"
              onClick={onNavigate}
              className="group relative isolate block overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-primary/10 px-3.5 py-3 transition-colors hover:border-accent/40"
            >
              <GlowEffect tone="accent" className="opacity-0 transition-opacity duration-500 group-hover:opacity-60" />
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                  <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground">Ask FinBrain</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    Analyze your finances
                  </span>
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </div>
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}
