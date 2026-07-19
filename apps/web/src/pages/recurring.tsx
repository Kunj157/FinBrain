import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Repeat,
  ChevronLeft,
  ChevronRight,
  LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Currency as SharedCurrency, RecurringPattern, RecurringSummary } from '@finbrain/shared';

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  biweekly: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  monthly: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  quarterly: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  yearly: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function generateFutureDates(nextDate: string, frequency: string, months: number): string[] {
  const dates: string[] = [];
  const start = new Date(nextDate);
  const end = new Date();
  end.setMonth(end.getMonth() + months);

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    switch (frequency) {
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current.setMonth(current.getMonth() + 1);
    }
  }
  return dates;
}

function CalendarView({ patterns, currency }: { patterns: RecurringPattern[]; currency: SharedCurrency }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const calendarEvents = useMemo(() => {
    const events: Record<string, Array<{ pattern: RecurringPattern; isHistorical: boolean }>> = {};

    for (const pattern of patterns) {
      const futureDates = generateFutureDates(pattern.nextExpectedDate, pattern.frequency, 6);
      for (const dateStr of futureDates) {
        const d = new Date(dateStr);
        if (d >= monthStart && d <= monthEnd) {
          if (!events[dateStr]) events[dateStr] = [];
          events[dateStr].push({ pattern, isHistorical: false });
        }
      }

      for (const txn of pattern.transactions) {
        const txnDate = typeof txn.date === 'string' ? txn.date.split('T')[0] : new Date(txn.date).toISOString().split('T')[0];
        const d = new Date(txnDate);
        if (d >= monthStart && d <= monthEnd) {
          if (!events[txnDate]) events[txnDate] = [];
          events[txnDate].push({ pattern, isHistorical: true });
        }
      }
    }
    return events;
  }, [patterns, monthStart.getTime(), monthEnd.getTime()]);

  const today = new Date().toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalDue = useMemo(() => {
    let total = 0;
    for (const events of Object.values(calendarEvents)) {
      for (const e of events) {
        if (!e.isHistorical) total += e.pattern.avgAmount;
      }
    }
    return total;
  }, [calendarEvents]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[180px] text-center">{monthLabel}</h2>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs text-emerald-400 hover:text-emerald-300 ml-2 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          {Object.values(calendarEvents).flat().filter((e) => !e.isHistorical).length} bills due ·{' '}
          <span className="text-white font-medium">{formatCurrency(totalDue, currency)}</span>
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px">
            {days.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] bg-white/[0.01]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = calendarEvents[dateStr] || [];
              const isToday = dateStr === today;

              return (
                <div
                  key={day}
                  className={`min-h-[80px] p-1.5 rounded-lg border transition-colors ${
                    isToday ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((event, idx) => (
                      <div
                        key={`${event.pattern.id}-${idx}`}
                        className={`text-[9px] px-1 py-0.5 rounded truncate ${
                          event.isHistorical
                            ? 'bg-white/[0.04] text-muted-foreground line-through'
                            : `${FREQUENCY_COLORS[event.pattern.frequency]?.split(' ').filter(c => c.startsWith('bg-')).join(' ') || 'bg-white/10'} text-white/80`
                        }`}
                        title={`${event.pattern.merchant}: ${formatCurrency(event.pattern.avgAmount, currency)}`}
                      >
                        {event.pattern.merchant}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[9px] text-muted-foreground text-center">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {Object.entries(FREQUENCY_COLORS).map(([freq, colorClass]) => (
          <div key={freq} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${colorClass.split(' ')[0]}`} />
            <span>{FREQUENCY_LABELS[freq]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span>Past (historical)</span>
        </div>
      </div>
    </div>
  );
}

export default function Recurring() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/recurring');
      setPatterns(res.data.data.patterns);
      setSummary(res.data.data.summary);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const upcomingPatterns = patterns.filter(p => {
    const next = new Date(p.nextExpectedDate);
    return next >= now;
  });
  const pastPatterns = patterns.filter(p => {
    const next = new Date(p.nextExpectedDate);
    return next < now;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detected bills and subscriptions from your transaction history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground hover:text-white'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Monthly Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(summary.totalMonthlyCost, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> Active Recurring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Due This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.upcomingThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.totalTransactions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto animate-spin" />
        </div>
      ) : patterns.length === 0 ? (
        <div className="py-16 text-center">
          <Repeat className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">No recurring transactions detected</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Import more transactions to detect recurring patterns
          </p>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView patterns={patterns} currency={currency} />
      ) : (
        <div className="space-y-4">
          {upcomingPatterns.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Upcoming ({upcomingPatterns.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingPatterns.map(p => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    currency={currency}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pastPatterns.length > 0 && (
            <div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 hover:text-foreground transition-colors"
              >
                {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Past / Inactive ({pastPatterns.length})
              </button>
              {showInactive && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastPatterns.map(p => (
                    <PatternCard
                      key={p.id}
                      pattern={p}
                      currency={currency}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      isPast
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatternCard({
  pattern,
  currency,
  expanded,
  onToggle,
  isPast = false,
}: {
  pattern: RecurringPattern;
  currency: SharedCurrency;
  expanded: boolean;
  onToggle: () => void;
  isPast?: boolean;
}) {
  const daysUntil = Math.ceil(
    (new Date(pattern.nextExpectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
  const annualCost = pattern.monthlyCost * 12;

  return (
    <Card
      className={`group card-hover cursor-pointer ${isPast ? 'opacity-60' : ''} ${isDueSoon ? 'border-amber-500/30' : ''}`}
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">{pattern.merchant}</CardTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{pattern.description}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${FREQUENCY_COLORS[pattern.frequency]}`}>
              {FREQUENCY_LABELS[pattern.frequency]}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: pattern.categoryColor }}
          />
          <span className="text-xs text-muted-foreground">{pattern.categoryName}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-semibold">{formatCurrency(pattern.avgAmount, currency)}</span>
          <span className="text-xs text-muted-foreground">
            {pattern.transactionCount}x
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>~{formatCurrency(pattern.monthlyCost, currency)}/mo</span>
          <span>{formatCurrency(annualCost, currency)}/yr</span>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-xs ${isDueSoon ? 'text-amber-400 font-medium' : 'text-muted-foreground'}`}>
            {daysUntil < 0
              ? `${Math.abs(daysUntil)} days overdue`
              : daysUntil === 0
                ? 'Due today'
                : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
          </span>
        </div>

        {expanded && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-xs font-medium text-muted-foreground">History</p>
            {pattern.transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.date}</span>
                <span className="font-medium">{formatCurrency(t.amount, currency)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-white/[0.04]">
              <span className="text-muted-foreground">Total spent</span>
              <span>{formatCurrency(pattern.totalSpent, currency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
