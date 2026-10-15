import { AnimatePresence, m } from 'motion/react';
import { Search, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { NotificationBell } from '@/components/notifications';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Header({ onSearchOpen, onMenuToggle }: { onSearchOpen: () => void; onMenuToggle: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl backdrop-saturate-150 md:h-16 md:px-6">
      <div className="flex flex-1 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 md:hidden"
          onClick={onMenuToggle}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K"
          className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-foreground/[0.02] px-3 text-sm text-muted-foreground shadow-edge transition-colors hover:border-border-strong hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate text-left">Search transactions, accounts, goals…</span>
          <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="relative overflow-hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={theme}
              initial={{ y: 14, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -14, rotate: 90, opacity: 0 }}
              className="flex"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </m.span>
          </AnimatePresence>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
          className="hidden sm:flex"
        >
          <LogOut className="h-4 w-4" />
        </Button>

        <div className="ml-1 flex items-center gap-2.5 border-l pl-3 md:ml-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight">
              {user?.username ? `@${user.username}` : user?.name || 'User'}
            </p>
            <p className="text-[10px] text-muted-foreground">Free plan</p>
          </div>
          <Avatar fallback={initials} size="sm" />
        </div>
      </div>
    </header>
  );
}
