import type { AdvisorProfileData } from './profile-engine';

export interface AffordabilityInput {
  itemName: string;
  amount: number;
  currency: string;
  purchaseDate?: string;
  paymentMethod: 'cash' | 'credit' | 'financing';
  financingMonths?: number | null;
  financingApr?: number | null;
  priority: 'need' | 'want' | 'investment' | 'emergency';
}

export interface AffordabilityDecision {
  decision: 'recommended' | 'reasonable' | 'caution' | 'not_recommended' | 'insufficient_data';
  confidence: number;
  summary: string;
  assumedPurchaseAmount: number;
  currentCashAvailable: number;
  projectedBalances: Array<{ date: string; before: number; after: number }>;
  impact: {
    emergencyFundMonthsBefore: number;
    emergencyFundMonthsAfter: number;
    savingsRateBefore: number;
    savingsRateAfter: number;
    budgetImpact: Array<{ category: string; beforeUtilization: number; afterUtilization: number }>;
    goalDelays: Array<{ goalId: string; name: string; delayDays: number }>;
    debtRisk?: string;
    investmentImpact?: string;
  };
  reasons: string[];
  alternatives: string[];
  nextBestActions: string[];
}

function projectBalance(
  currentBalance: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  monthsAhead: number,
): Array<{ date: string; before: number; after: number }> {
  const result: Array<{ date: string; before: number; after: number }> = [];
  const now = new Date();

  for (let i = 1; i <= monthsAhead; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    const netFlow = monthlyIncome - monthlyExpenses;
    const projected = currentBalance + netFlow * i;
    result.push({
      date: d.toISOString().split('T')[0],
      before: Math.round(projected * 100) / 100,
      after: Math.round(projected * 100) / 100,
    });
  }

  return result;
}

export function evaluateAffordability(
  input: AffordabilityInput,
  profile: AdvisorProfileData,
  currentBalance: number,
  savingsBalance: number,
  budgetUtilizations: Array<{ category: string; limit: number; spent: number }>,
  goals: Array<{ id: string; name: string; target: number; current: number; deadline: Date | null }>,
): AffordabilityDecision {
  const reasons: string[] = [];
  const alternatives: string[] = [];
  const nextBestActions: string[] = [];
  let confidence = 0.6;

  if (profile.confidence === 'low') {
    return {
      decision: 'insufficient_data',
      confidence: 0.2,
      summary: 'Insufficient data for a reliable affordability assessment. Please import more transactions or connect bank accounts.',
      assumedPurchaseAmount: input.amount,
      currentCashAvailable: currentBalance,
      projectedBalances: [],
      impact: {
        emergencyFundMonthsBefore: profile.emergencyFundMonths,
        emergencyFundMonthsAfter: profile.emergencyFundMonths,
        savingsRateBefore: profile.savingsRateAvg,
        savingsRateAfter: profile.savingsRateAvg,
        budgetImpact: [],
        goalDelays: [],
      },
      reasons: ['Not enough transaction history for reliable advice'],
      alternatives: ['Import at least 30-90 days of transaction data'],
      nextBestActions: ['Connect bank accounts via Plaid', 'Import CSV/PDF bank statements'],
    };
  }

  const afterBalance = currentBalance - input.amount;
  const afterSavings = savingsBalance - (input.paymentMethod === 'cash' ? input.amount : 0);

  const emergencyMonthsBefore = profile.emergencyFundMonths;
  const avgMonthlyExpenses = profile.monthlyExpenseAvg || 1;
  const emergencyMonthsAfter = afterSavings > 0
    ? Math.round((afterSavings / avgMonthlyExpenses) * 10) / 10
    : 0;

  const monthlyIncome = profile.monthlyIncomeAvg || 1;
  const savingsRateBefore = profile.savingsRateAvg;
  const monthlyPayment = input.paymentMethod === 'financing' && input.financingMonths
    ? input.amount / input.financingMonths
    : 0;
  const afterMonthlyExpenses = avgMonthlyExpenses + monthlyPayment;
  const savingsRateAfter = monthlyIncome > 0
    ? Math.round(((monthlyIncome - afterMonthlyExpenses) / monthlyIncome) * 10000) / 100
    : 0;

  const projectedBalances = projectBalance(currentBalance, monthlyIncome, afterMonthlyExpenses, 6);
  for (let i = 0; i < projectedBalances.length; i++) {
    projectedBalances[i].after = Math.round((projectedBalances[i].before - input.amount) * 100) / 100;
  }

  const goalDelays: Array<{ goalId: string; name: string; delayDays: number }> = [];
  if (input.priority !== 'need') {
    for (const g of goals) {
      const remaining = g.target - g.current;
      const monthlyContribution = monthlyIncome - avgMonthlyExpenses;
      if (monthlyContribution > 0) {
        const baseMonths = remaining / monthlyContribution;
        const adjustedMonths = (remaining + input.amount) / monthlyContribution;
        const delayDays = Math.round((adjustedMonths - baseMonths) * 30);
        if (delayDays > 0) {
          goalDelays.push({ goalId: g.id, name: g.name, delayDays });
        }
      }
    }
  }

  const debtRisk = input.paymentMethod === 'financing'
    ? `Financing at ${input.financingApr || 0}% APR for ${input.financingMonths || 0} months adds $${Math.round(monthlyPayment * 100) / 100}/month to expenses`
    : undefined;

  const investmentImpact = input.paymentMethod === 'cash' && afterBalance < savingsBalance * 0.1
    ? 'Using cash reserves may limit investment contributions'
    : undefined;

  let decision: AffordabilityDecision['decision'] = 'recommended';

  if (emergencyMonthsAfter < 1) {
    decision = 'not_recommended';
    reasons.push(`This purchase would reduce your emergency fund to ${emergencyMonthsAfter} month(s) — below the recommended 3-month minimum`);
  } else if (emergencyMonthsAfter < 3 && input.priority === 'want') {
    decision = 'caution';
    reasons.push(`Emergency fund would drop to ${emergencyMonthsAfter} months — below the 3-month safety threshold`);
  }

  const last90DayNetFlow = projectedBalances.length >= 3 ? projectedBalances[2].after : afterBalance;
  if (last90DayNetFlow < 0) {
    decision = 'not_recommended';
    reasons.push('This purchase would result in a negative 90-day projected balance');
  }

  if (goalDelays.some((g) => g.delayDays > 30)) {
    if (decision !== 'not_recommended') decision = 'caution';
    const worst = goalDelays.sort((a, b) => b.delayDays - a.delayDays)[0];
    reasons.push(`Would delay your "${worst.name}" goal by approximately ${worst.delayDays} days`);
  }

  if (savingsRateAfter < 0) {
    decision = 'not_recommended';
    reasons.push('Monthly expenses would exceed income after this purchase');
  } else if (savingsRateAfter < 10 && input.priority === 'want') {
    if (decision !== 'not_recommended') decision = 'caution';
    reasons.push(`Savings rate would drop from ${savingsRateBefore}% to ${savingsRateAfter}%`);
  }

  if (input.paymentMethod === 'financing' && input.financingApr && input.financingApr > 15) {
    if (decision !== 'not_recommended') decision = 'caution';
    reasons.push(`High APR financing (${input.financingApr}%) significantly increases total cost`);
  }

  if (decision === 'recommended' && input.priority === 'want') {
    if (emergencyMonthsAfter >= 3 && savingsRateAfter >= 20 && goalDelays.length === 0) {
      decision = 'recommended';
      reasons.push('Emergency fund remains healthy, savings rate stays strong, goals unaffected');
    } else if (emergencyMonthsAfter >= 3 && savingsRateAfter >= 15) {
      decision = 'reasonable';
      reasons.push('Financially feasible with minor impact on savings goals');
    }
  }

  if (input.priority === 'need') {
    if (decision === 'caution' && emergencyMonthsAfter >= 1) {
      decision = 'reasonable';
      reasons.push('This is a necessity — prioritize it but monitor spending closely');
    }
  }

  if (decision === 'recommended' || decision === 'reasonable') {
    alternatives.push(`Save for ${Math.ceil(input.amount / (monthlyIncome - avgMonthlyExpenses))} months and buy with cash`);
    if (input.priority === 'want') {
      alternatives.push('Look for a lower-cost alternative');
      alternatives.push('Wait for a sale or promotional period');
    }
  }

  nextBestActions.push('Review your budget for the current month');
  if (goalDelays.length > 0) nextBestActions.push('Consider increasing contributions to offset delays');
  if (emergencyMonthsAfter < 3) nextBestActions.push('Build emergency fund before non-essential purchases');

  if (profile.confidence === 'medium') {
    confidence = 0.5;
    reasons.push('(Based on limited data — verify these numbers with your actual account balances)');
  }

  return {
    decision,
    confidence,
    summary: `Based on your financial profile, purchasing "${input.itemName}" for $${input.amount} is ${decision.replace('_', ' ')}.`,
    assumedPurchaseAmount: input.amount,
    currentCashAvailable: currentBalance,
    projectedBalances,
    impact: {
      emergencyFundMonthsBefore: emergencyMonthsBefore,
      emergencyFundMonthsAfter: emergencyMonthsAfter,
      savingsRateBefore,
      savingsRateAfter,
      budgetImpact: budgetUtilizations.map((b) => ({
        category: b.category,
        beforeUtilization: b.limit > 0 ? Math.round((b.spent / b.limit) * 10000) / 100 : 0,
        afterUtilization: b.limit > 0 ? Math.round(((b.spent + (b.category === 'Other' ? input.amount : 0)) / b.limit) * 10000) / 100 : 0,
      })),
      goalDelays,
      debtRisk,
      investmentImpact,
    },
    reasons,
    alternatives,
    nextBestActions,
  };
}
