import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  ScrollText,
  Repeat,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },

  { icon: Building2, label: 'Accounts', path: '/accounts' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/transactions' },
  { icon: Tags, label: 'Categories', path: '/categories' },
  { icon: ScrollText, label: 'Rules', path: '/rules' },
  { icon: PiggyBank, label: 'Budgets', path: '/budgets' },
  { icon: Repeat, label: 'Recurring', path: '/recurring' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Receipt, label: 'Receipts', path: '/receipts' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Sparkles, label: 'AI Insights', path: '/insights' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="h-full w-[240px]" role="navigation" aria-label="Main navigation">
      <div className="flex h-full flex-col glass-strong">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/[0.04]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-gradient font-bold text-lg">F</span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              <span className="text-gradient">Fin</span>
              <span className="text-foreground">Brain</span>
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
              AI Finance Co-Pilot
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'nav-link group',
                  isActive && 'active',
                  !isActive && 'opacity-70 hover:opacity-100',
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.label === 'AI Insights' && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.04] px-3 py-3">
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'nav-link',
                  isActive && 'active',
                  !isActive && 'opacity-70 hover:opacity-100',
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
