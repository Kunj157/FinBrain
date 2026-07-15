import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, DollarSign, PiggyBank, RefreshCw, Sparkles } from 'lucide-react';
import { formatCurrency } from './utils';
import type { Transaction, Category, Budget, Goal, Currency as SharedCurrency } from '@finbrain/shared';

export type Insight = {
  id: string;
  type: 'alert' | 'insight' | 'suggestion';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
};

export function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: Goal[],
  currency: SharedCurrency,
): Insight[] {
  const now = new Date();
  const insights: Insight[] = [];
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const thisMonthExpenses = thisMonth.filter((t) => t.type === 'expense');
  const lastMonthExpenses = lastMonth.filter((t) => t.type === 'expense');
  const thisTotal = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const lastTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);

  if (lastTotal > 0) {
    const change = ((thisTotal - lastTotal) / lastTotal) * 100;
    if (change > 20) {
      insights.push({
        id: 'spending-surge',
        type: 'alert',
        severity: 'high',
        title: 'Spending Surge Detected',
        description: `Your expenses are up ${change.toFixed(0)}% compared to last month (${formatCurrency(thisTotal, currency)} vs ${formatCurrency(lastTotal, currency)}). Review your recent transactions to identify where the extra spending is coming from.`,
        icon: TrendingUp,
        color: 'text-rose-400',
      });
    } else if (change < -15) {
      insights.push({
        id: 'spending-drop',
        type: 'insight',
        severity: 'low',
        title: 'Great Spending Discipline',
        description: `Your expenses dropped ${Math.abs(change).toFixed(0)}% this month — from ${formatCurrency(lastTotal, currency)} to ${formatCurrency(thisTotal, currency)}. Keep up the good work!`,
        icon: TrendingDown,
        color: 'text-emerald-400',
      });
    }
  }

  const catTotals: Record<string, number> = {};
  for (const t of thisMonthExpenses) {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
  }
  const topCat = Object.entries(catTotals).sort(([, a], [, b]) => b - a)[0];
  if (topCat) {
    const cat = categories.find((c) => c.id === topCat[0]);
    const pct = thisTotal > 0 ? ((topCat[1] / thisTotal) * 100).toFixed(0) : '0';
    insights.push({
      id: 'top-category',
      type: 'insight',
      severity: 'medium',
      title: `Top Spending: ${cat?.name || 'Unknown'}`,
      description: `You've spent ${formatCurrency(topCat[1], currency)} on ${cat?.name || 'this category'} this month — that's ${pct}% of your total expenses. ${Number(pct) > 40 ? 'This seems high — consider if there are ways to reduce.' : ''}`,
      icon: Target,
      color: 'text-blue-400',
    });
  }

  for (const budget of budgets) {
    if (budget.spent > budget.amount) {
      const over = budget.spent - budget.amount;
      const cat = categories.find((c) => c.id === budget.categoryId);
      insights.push({
        id: `budget-over-${budget.id}`,
        type: 'alert',
        severity: budget.spent > budget.amount * 1.2 ? 'high' : 'medium',
        title: `${cat?.name || 'Budget'} Over Budget`,
        description: `You've exceeded your ${budget.period} ${cat?.name || ''} budget by ${formatCurrency(over, currency)}. Consider adjusting your spending for the rest of the period.`,
        icon: AlertTriangle,
        color: 'text-amber-400',
      });
    } else if (budget.spent > budget.amount * 0.8) {
      const cat = categories.find((c) => c.id === budget.categoryId);
      insights.push({
        id: `budget-warning-${budget.id}`,
        type: 'suggestion',
        severity: 'low',
        title: `${cat?.name || 'Budget'} Nearing Limit`,
        description: `You've used ${((budget.spent / budget.amount) * 100).toFixed(0)}% of your ${cat?.name || ''} budget with days remaining. Pace your spending to stay on track.`,
        icon: Lightbulb,
        color: 'text-blue-400',
      });
    }
  }

  for (const goal of goals) {
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      const remaining = goal.targetAmount - goal.currentAmount;
      if (daysLeft > 0 && remaining > 0) {
        const neededPerDay = remaining / daysLeft;
        const recentDailyIncome = (() => {
          const last30 = transactions.filter((t) => {
            const d = new Date(t.date);
            return t.type === 'income' && (now.getTime() - d.getTime()) <= 30 * 86400000;
          });
          return last30.reduce((s, t) => s + t.amount, 0) / 30;
        })();
        if (recentDailyIncome > 0 && neededPerDay > recentDailyIncome * 0.3) {
          insights.push({
            id: `goal-atrisk-${goal.id}`,
            type: 'alert',
            severity: 'medium',
            title: `${goal.name} Goal at Risk`,
            description: `You need ${formatCurrency(remaining, currency)} in ${daysLeft} days to reach your ${goal.name} goal. That requires saving ~${formatCurrency(neededPerDay, currency)}/day.`,
            icon: AlertTriangle,
            color: 'text-amber-400',
          });
        }
      }
      if (daysLeft < 0 && goal.currentAmount < goal.targetAmount) {
        insights.push({
          id: `goal-missed-${goal.id}`,
          type: 'alert',
          severity: 'low',
          title: `${goal.name} Goal Passed Deadline`,
          description: `Your ${goal.name} goal deadline has passed with ${formatCurrency(goal.currentAmount, currency)} saved out of ${formatCurrency(goal.targetAmount, currency)}. Consider extending the deadline or adjusting the target.`,
          icon: Target,
          color: 'text-muted-foreground',
        });
      }
    }
  }

  const recurring = transactions.filter((t) => t.isRecurring);
  if (recurring.length > 0) {
    const recurringTotal = recurring.reduce((s, t) => s + t.amount, 0);
    insights.push({
      id: 'recurring-summary',
      type: 'insight',
      severity: 'low',
      title: `${recurring.length} Recurring Transactions`,
      description: `You have ${recurring.length} recurring transactions totaling ${formatCurrency(recurringTotal, currency)}. Review these to ensure they're all still needed.`,
      icon: RefreshCw,
      color: 'text-purple-400',
    });
  }

  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  if (income > 0) {
    const sr = ((net / income) * 100).toFixed(0);
    if (Number(sr) < 20) {
      insights.push({
        id: 'low-savings',
        type: 'suggestion',
        severity: Number(sr) < 0 ? 'high' : 'medium',
        title: 'Savings Rate Below 20%',
        description: `Your savings rate is ${sr}%. Financial experts recommend saving at least 20% of your income. Look for expenses you can reduce to boost your savings.`,
        icon: PiggyBank,
        color: 'text-amber-400',
      });
    }
  }

  const avgDaily = thisMonthExpenses.length > 0
    ? thisTotal / [...new Set(thisMonthExpenses.map((t) => new Date(t.date).toDateString()))].length
    : 0;
  if (avgDaily > 0) {
    insights.push({
      id: 'daily-spend',
      type: 'insight',
      severity: 'low',
      title: 'Daily Spending Average',
      description: `You're averaging ${formatCurrency(avgDaily, currency)}/day this month across ${thisMonthExpenses.length} transactions.`,
      icon: DollarSign,
      color: 'text-blue-400',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'no-data',
      type: 'insight',
      severity: 'low',
      title: 'Add More Data for Insights',
      description: 'Import transactions or connect a bank account to unlock AI-powered financial insights.',
      icon: Sparkles,
      color: 'text-muted-foreground',
    });
  }

  return insights;
}

export function generateAnswer(
  question: string,
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  goals: Goal[],
  currency: SharedCurrency,
): string {
  const q = question.toLowerCase();
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  if (q.includes('spend') && (q.includes('month') || q.includes('total'))) {
    return `This month you've spent ${formatCurrency(totalExpenses, currency)} across ${expenses.length} transactions. Your top categories are: ${
      Object.entries(
        expenses.reduce((acc: Record<string, number>, t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          acc[cat?.name || 'Unknown'] = (acc[cat?.name || 'Unknown'] || 0) + t.amount;
          return acc;
        }, {})
      ).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, amt]) => `${name} (${formatCurrency(amt, currency)})`).join(', ') || 'none yet'
    }.`;
  }

  if (q.includes('income') || q.includes('earn') || q.includes('make')) {
    return `Your income this month is ${formatCurrency(income, currency)}. ${
      income > totalExpenses
        ? `That's ${formatCurrency(income - totalExpenses, currency)} more than your expenses — nice!`
        : `Your expenses exceed your income by ${formatCurrency(totalExpenses - income, currency)}.`
    }`;
  }

  if (q.includes('save') || q.includes('savings')) {
    const saved = income - totalExpenses;
    const rate = income > 0 ? ((saved / income) * 100).toFixed(1) : '0';
    return `Your savings this month: ${formatCurrency(saved, currency)} (${rate}% savings rate). ${
      goals.length > 0
        ? `You have ${goals.length} active goals: ${goals.map((g) => `${g.name} (${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%)`).join(', ')}.`
        : 'Consider setting up savings goals to track your progress.'
    }`;
  }

  if (q.includes('budget')) {
    if (budgets.length === 0) {
      return 'You haven\'t set up any budgets yet. Go to the Budgets page to create spending limits for your categories.';
    }
    const overBudgetItems = budgets.filter((b) => b.spent > b.amount);
    if (overBudgetItems.length > 0) {
      return `You're over budget in ${overBudgetItems.length} categories: ${overBudgetItems.map((b) => {
        const cat = categories.find((c) => c.id === b.categoryId);
        return `${cat?.name || 'Unknown'} (${((b.spent / b.amount) * 100).toFixed(0)}%)`;
      }).join(', ')}. Try to reduce spending in these areas.`;
    }
    return `All your budgets are on track! You have ${budgets.length} active budgets with an average utilization of ${
      (budgets.reduce((s, b) => s + b.spent / b.amount, 0) / budgets.length * 100).toFixed(0)
    }%.`;
  }

  if (q.includes('goal')) {
    if (goals.length === 0) {
      return 'No savings goals yet. Head to the Goals page to set up targets like an emergency fund or vacation savings.';
    }
    return `You have ${goals.length} goals: ${goals.map((g) => {
      const pct = ((g.currentAmount / g.targetAmount) * 100).toFixed(0);
      return `${g.icon} ${g.name}: ${pct}% complete (${formatCurrency(g.currentAmount, currency)} of ${formatCurrency(g.targetAmount, currency)})`;
    }).join('. ')}.`;
  }

  if (q.includes('biggest') || q.includes('top') || q.includes('most')) {
    const catTotals: Record<string, number> = {};
    for (const t of expenses) {
      const cat = categories.find((c) => c.id === t.categoryId);
      catTotals[cat?.name || 'Unknown'] = (catTotals[cat?.name || 'Unknown'] || 0) + t.amount;
    }
    const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
    if (sorted.length === 0) return 'No expense data this month to analyze.';
    return `Your biggest spending categories this month: ${sorted.slice(0, 5).map(([name, amt]) =>
      `${name}: ${formatCurrency(amt, currency)}`
    ).join('. ')}.`;
  }

  if (q.includes('subscription') || q.includes('recurring')) {
    const recurring = transactions.filter((t) => t.isRecurring);
    if (recurring.length === 0) return 'No recurring transactions found. Import more data to identify subscriptions.';
    const total = recurring.reduce((s, t) => s + t.amount, 0);
    return `You have ${recurring.length} recurring transactions totaling ${formatCurrency(total, currency)}. Consider reviewing these to ensure you're not paying for unused services.`;
  }

  if (q.includes('tip') || q.includes('advice') || q.includes('improve') || q.includes('better')) {
    const tips: string[] = [];
    const sr = income > 0 ? ((income - totalExpenses) / income) * 100 : 0;
    if (sr < 20) tips.push('Aim to save at least 20% of your income. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.');
    const overBudgetItems = budgets.filter((b) => b.spent > b.amount);
    if (overBudgetItems.length > 0) tips.push(`You're over budget in ${overBudgetItems.length} categories. Review those areas for cuts.`);
    const dailyAvg = expenses.length > 0 ? totalExpenses / [...new Set(expenses.map((t) => new Date(t.date).toDateString()))].length : 0;
    if (dailyAvg > 100) tips.push(`Your daily average is ${formatCurrency(dailyAvg, currency)}. Small daily savings add up fast.`);
    if (goals.length === 0) tips.push('Set specific financial goals to stay motivated and track progress.');
    if (tips.length === 0) tips.push('Your finances look healthy! Keep maintaining your current habits.');
    return tips.join(' ');
  }

  return `I can help you analyze your finances! Try asking about:\n• Your monthly spending or income\n• Budget status\n• Savings goals\n• Biggest expense categories\n• Recurring subscriptions\n• Financial tips`;
}
