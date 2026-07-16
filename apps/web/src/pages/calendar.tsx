import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, Transaction, Category, RecurringPattern } from '@finbrain/shared';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [txnRes, catRes, recRes] = await Promise.all([
        api.get(`/transactions?startDate=${start}&endDate=${end}&limit=1000`),
        api.get('/categories'),
        api.get('/recurring'),
      ]);

      setTxns(txnRes.data.data.data);
      setCategories(catRes.data.data);
      setPatterns(recRes.data.data?.patterns || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const txnsByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const t of txns) {
      const key = new Date(t.date).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [txns]);

  const patternsByDate = useMemo(() => {
    const map: Record<string, RecurringPattern[]> = {};
    for (const p of patterns) {
      const next = new Date(p.nextExpectedDate);
      if (next.getMonth() === month && next.getFullYear() === year) {
        const key = next.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    }
    return map;
  }, [patterns, month, year]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedTxns = selectedDate ? txnsByDate[selectedDate] || [] : [];
  const selectedPatterns = selectedDate ? patternsByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View transactions and upcoming bills on a calendar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {MONTHS[month]} {year}
                </h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground/30 mx-auto animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-white/[0.03] rounded-lg overflow-hidden">
                  {DAYS.map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground bg-background/50">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2 min-h-[80px] bg-background/30" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayTxns = txnsByDate[dateKey] || [];
                    const dayPatterns = patternsByDate[dateKey] || [];
                    const isToday = isCurrentMonth && today.getDate() === day;
                    const isSelected = selectedDate === dateKey;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(dateKey)}
                        className={`p-2 min-h-[80px] text-left transition-colors ${
                          isSelected ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' :
                          isToday ? 'bg-white/[0.04]' :
                          'bg-background/30 hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayPatterns.slice(0, 2).map((p) => (
                            <div key={p.id} className="text-[10px] truncate px-1 py-0.5 rounded bg-violet-500/10 text-violet-400">
                              {p.merchant}
                            </div>
                          ))}
                          {dayTxns.slice(0, 2).map((t) => (
                            <div
                              key={t.id}
                              className={`text-[10px] truncate px-1 py-0.5 rounded ${
                                t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {t.merchant || t.description}
                            </div>
                          ))}
                          {(dayTxns.length + dayPatterns.length) > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{(dayTxns.length + dayPatterns.length) - 2} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-5">
              {selectedDate ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedTxns.length} transaction{selectedTxns.length !== 1 ? 's' : ''}{' '}
                      {selectedPatterns.length > 0 && `· ${selectedPatterns.length} bill${selectedPatterns.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {selectedPatterns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Bills Due</p>
                      {selectedPatterns.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.categoryColor }} />
                            <div>
                              <p className="text-sm font-medium">{p.merchant}</p>
                              <p className="text-xs text-muted-foreground">{p.categoryName}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium">{formatCurrency(p.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTxns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Transactions</p>
                      {selectedTxns.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: categoryMap[t.categoryId]?.color || '#6b7280' }}
                            />
                            <div>
                              <p className="text-sm font-medium">{t.merchant || t.description}</p>
                              <p className="text-xs text-muted-foreground">{categoryMap[t.categoryId]?.name || 'Other'}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${t.type === 'income' ? 'text-emerald-400' : ''}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTxns.length === 0 && selectedPatterns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity on this date</p>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground mt-3">Select a date to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
