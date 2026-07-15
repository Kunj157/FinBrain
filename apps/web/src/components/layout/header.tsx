import { Bell, Search, Sun, Moon, LogOut, Menu, Check } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function Header({ onSearchOpen, onMenuToggle }: { onSearchOpen: () => void; onMenuToggle: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const fetchUnread = useCallback(() => {
    api.get('/notifications/unread-count')
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    api.get('/notifications')
      .then((res) => setNotifications(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  useEffect(() => {
    if (!showNotifs) return;
    fetchNotifications();
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs, fetchNotifications]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

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
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            onClick={() => setShowNotifs((v) => !v)}
            className="relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-xl glass border border-white/[0.06] shadow-2xl z-50" role="menu">
              <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left p-3 hover:bg-white/[0.04] transition-colors ${!n.read ? 'bg-emerald-500/[0.04]' : ''}`}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                      role="menuitem"
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
