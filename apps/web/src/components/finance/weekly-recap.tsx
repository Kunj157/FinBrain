import { useState, useEffect } from 'react';
import {
  Calendar, TrendingUp, TrendingDown, DollarSign, Repeat,
  Target, PiggyBank, Loader2, ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface WeeklyRecapData {
  period: { start: string; end: string };
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  topSpendingDrivers: Array<{ category: string; amount: number }>;
  newRecurringCharges: Array<{ merchant: string; amount: number }>;
  budgetProgress: Array<{ category: string; budget: number; spent: number; utilization: number }>;
  goalProgress: Array<{ name: string; current: number; target: number; progressPercent: number }>;
  netWorthMovement: number;
  investmentMovement: number;
  recommendedAction: string;
}

export function WeeklyRecap() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as string;
  const [recap, setRecap] = useState<WeeklyRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchRecap = async () => {
      try {
        const res = await api.get('/advisor/weekly-recap');
        setRecap(res.data.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchRecap();
  }, []);

  if (loading) {
    return (
      <Card className="stat-card">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!recap) return null;

  const isPositive = recap.netCashFlow >= 0;

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            Weekly Recap
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {recap.period.start} — {recap.period.end}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground">Income</span>
            </div>
            <p className="text-sm font-semibold text-emerald-400">
              {formatCurrency(recap.totalIncome, currency)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-rose-400" />
              <span className="text-[10px] text-muted-foreground">Expenses</span>
            </div>
            <p className="text-sm font-semibold text-rose-400">
              {formatCurrency(recap.totalExpenses, currency)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className={`h-3 w-3 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="text-[10px] text-muted-foreground">Net</span>
            </div>
            <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(recap.netCashFlow, currency)}
            </p>
          </div>
        </div>

        {recap.topSpendingDrivers.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Spending</p>
            <div className="space-y-1.5">
              {recap.topSpendingDrivers.slice(0, 3).map((d) => (
                <div key={d.category} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{d.category}</span>
                  <span className="text-xs font-medium">{formatCurrency(d.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recap.newRecurringCharges.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Repeat className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400">New Recurring Charges</span>
            </div>
            {recap.newRecurringCharges.map((c) => (
              <p key={c.merchant} className="text-xs text-muted-foreground">
                {c.merchant} — {formatCurrency(c.amount, currency)}
              </p>
            ))}
          </div>
        )}

        {expanded && (
          <>
            {recap.budgetProgress.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Budget Progress</p>
                <div className="space-y-2">
                  {recap.budgetProgress.map((b) => (
                    <div key={b.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{b.category}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatCurrency(b.spent, currency)} / {formatCurrency(b.budget, currency)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            b.utilization > 100 ? 'bg-rose-400' :
                            b.utilization > 80 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(b.utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recap.goalProgress.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Goal Progress</p>
                <div className="space-y-2">
                  {recap.goalProgress.map((g) => (
                    <div key={g.name} className="flex items-center gap-2">
                      <Target className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs truncate">{g.name}</span>
                          <span className="text-[10px] text-muted-foreground">{g.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${Math.min(g.progressPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {recap.recommendedAction && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{recap.recommendedAction}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Show less' : 'Show details'}
        </Button>
      </CardContent>
    </Card>
  );
}
