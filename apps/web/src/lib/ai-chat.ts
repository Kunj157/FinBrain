import { formatCurrency } from '@/lib/utils';
import type { Transaction, Category, Budget, Goal, Currency as SharedCurrency } from '@finbrain/shared';

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
    const overBudget = budgets.filter((b) => b.spent > b.amount);
    if (overBudget.length > 0) {
      return `You're over budget in ${overBudget.length} categories: ${overBudget.map((b) => {
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
    const ob = budgets.filter((b) => b.spent > b.amount);
    if (ob.length > 0) tips.push(`You're over budget in ${ob.length} categories. Review those areas for cuts.`);
    const dailyAvg = expenses.length > 0 ? totalExpenses / [...new Set(expenses.map((t) => new Date(t.date).toDateString()))].length : 0;
    if (dailyAvg > 100) tips.push(`Your daily average is ${formatCurrency(dailyAvg, currency)}. Small daily savings add up fast.`);
    if (goals.length === 0) tips.push('Set specific financial goals to stay motivated and track progress.');
    if (tips.length === 0) tips.push('Your finances look healthy! Keep maintaining your current habits.');
    return tips.join(' ');
  }

  return `I can help you analyze your finances! Try asking about:\n• Your monthly spending or income\n• Budget status\n• Savings goals\n• Biggest expense categories\n• Recurring subscriptions\n• Financial tips`;
}
