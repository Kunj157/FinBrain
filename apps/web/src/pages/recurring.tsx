import { useState, useCallback, useEffect } from 'react';
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
  List,
  ChevronLeft,
  ChevronRight,
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Recurring() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

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
  const upcomingPatterns = patterns.filter(p => new Date(p.nextExpectedDate) >= now);
  const pastPatterns = patterns.filter(p => new Date(p.nextExpectedDate) < now);

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const patternsByDate: Record<number, RecurringPattern[]> = {};
  for (const p of patterns) {
    const d = new Date(p.nextExpectedDate);
    if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
      const day = d.getDate();
      if (!patternsByDate[day]) patternsByDate[day] = [];
      patternsByDate[day].push(p);
    }
  }

  function prevMonth() {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  }

  function nextMonth() {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  }

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
          <div className="flex bg-gray-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="h-3.5 w-3.5 inline mr-1" /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1" /> Calendar
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
      ) : view === 'calendar' ? (
        <Card className="border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 hover:bg-white/[0.04] rounded">
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <h3 className="text-sm font-medium">
                {MONTHS[calendarMonth]} {calendarYear}
              </h3>
              <button onClick={nextMonth} className="p-1 hover:bg-white/[0.04] rounded">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
              {DAYS.map(d => (
                <div key={d} className="bg-gray-900/60 p-2 text-center">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{d}</span>
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-900/60 p-2 min-h-[80px]" />
              ))}
              {calendarDays.map(day => {
                const dayPatterns = patternsByDate[day] || [];
                const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
                return (
                  <div
                    key={day}
                    className={`bg-gray-900/60 p-1.5 min-h-[80px] hover:bg-gray-800/60 transition-colors ${isToday ? 'ring-1 ring-emerald-500/30' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayPatterns.slice(0, 3).map(p => (
                        <div
                          key={p.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate"
                          style={{ backgroundColor: `${p.categoryColor}20`, color: p.categoryColor }}
                          title={`${p.merchant}: ${formatCurrency(p.avgAmount, currency)}`}
                        >
                          {p.merchant}
                        </div>
                      ))}
                      {dayPatterns.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayPatterns.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
