import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Header() {
  const [isDark, setIsDark] = useState(true);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.04] bg-background/60 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-1.5 text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/[0.06]">
          <div className="text-right">
            <p className="text-xs font-medium">Kunj Shah</p>
            <p className="text-[10px] text-muted-foreground">Free Plan</p>
          </div>
          <Avatar fallback="KS" size="sm" />
        </div>
      </div>
    </header>
  );
}
