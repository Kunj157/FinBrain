import { Bell, Search, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

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
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-white/[0.04] bg-background/60 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" onClick={onMenuToggle} aria-label="Toggle navigation menu">
          <Menu className="h-5 w-5" />
        </Button>

        <button
          onClick={onSearchOpen}
          className="relative flex-1 max-w-md cursor-text"
          aria-label="Open search"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-muted-foreground/50 flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all">
            Search...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-1.5 text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="hidden sm:flex">
          <LogOut className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 md:gap-3 ml-1 md:ml-2 pl-2 md:pl-3 border-l border-white/[0.06]">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium">
              {user?.username ? `@${user.username}` : user?.name || 'User'}
            </p>
            <p className="text-[10px] text-muted-foreground">Free Plan</p>
          </div>
          <Avatar fallback={initials} size="sm" />
        </div>
      </div>
    </header>
  );
}
