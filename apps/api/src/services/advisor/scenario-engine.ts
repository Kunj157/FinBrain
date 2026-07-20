import { type Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { roundMoney } from '../finance-math';

export interface ScenarioInput {
  name: string;
  scenarioType: string;
  input: Record<string, unknown>;
}

export interface ScenarioResult {
  projectedBalance: number;
  monthlyNetFlow: number;
  emergencyFundImpact: number;
  savingsRateChange: number;
  goalDelays: Array<{ name: string; delayDays: number }>;
  recommendation: string;
  confidence: number;
}

export async function createScenario(userId: string, input: ScenarioInput): Promise<ScenarioResult> {
  const profile = await prisma.advisorProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('No advisor profile found');

  const accounts = await prisma.account.findMany({ where: { userId } });
  const goals = await prisma.goal.findMany({ where: { userId } });

  const currentBalance = accounts
    .filter((a) => a.type === 'checking')
    .reduce((s, a) => s + a.balance, 0);

  const savingsBalance = accounts
    .filter((a) => a.type === 'savings')
    .reduce((s, a) => s + a.balance, 0);

  const monthlyIncome = profile.monthlyIncomeAvg;
  const monthlyExpenses = profile.monthlyExpenseAvg;

  let adjustedIncome = monthlyIncome;
  let adjustedExpenses = monthlyExpenses;
  let oneTimeExpense = 0;

  const scenarioInput = input.input as Record<string, unknown>;

  if (input.scenarioType === 'income_change') {
    const changePercent = (scenarioInput.changePercent as number) || 0;
    adjustedIncome = monthlyIncome * (1 + changePercent / 100);
  } else if (input.scenarioType === 'expense_change') {
    const changePercent = (scenarioInput.changePercent as number) || 0;
    adjustedExpenses = monthlyExpenses * (1 + changePercent / 100);
  } else if (input.scenarioType === 'purchase') {
    oneTimeExpense = (scenarioInput.amount as number) || 0;
  } else if (input.scenarioType === 'career_break') {
    const months = (scenarioInput.months as number) || 3;
    adjustedIncome = 0;
    oneTimeExpense = monthlyExpenses * months;
  } else if (input.scenarioType === 'new_job') {
    const salary = (scenarioInput.annualSalary as number) || 0;
    adjustedIncome = salary / 12;
  }

  const monthlyNetFlow = adjustedIncome - adjustedExpenses;
  const projectedBalance = currentBalance + monthlyNetFlow * 12 - oneTimeExpense;
  const emergencyFundImpact = savingsBalance > 0
    ? roundMoney((savingsBalance - oneTimeExpense) / (adjustedExpenses || 1))
    : 0;

  const savingsRateBefore = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const savingsRateAfter = adjustedIncome > 0 ? ((adjustedIncome - adjustedExpenses) / adjustedIncome) * 100 : 0;
  const savingsRateChange = roundMoney(savingsRateAfter - savingsRateBefore);

  const goalDelays: Array<{ name: string; delayDays: number }> = [];
  for (const g of goals) {
    const remaining = g.targetAmount - g.currentAmount;
    const baseMonthly = monthlyIncome - monthlyExpenses;
    const adjMonthly = adjustedIncome - adjustedExpenses;

    if (baseMonthly > 0 && adjMonthly > 0) {
      const baseMonths = remaining / baseMonthly;
      const adjMonths = (remaining + oneTimeExpense) / adjMonthly;
      const delayDays = Math.round((adjMonths - baseMonths) * 30);
      if (delayDays > 0) goalDelays.push({ name: g.name, delayDays });
    }
  }

  let recommendation: string;
  if (projectedBalance > 0 && savingsRateAfter >= 20) {
    recommendation = 'This scenario looks financially healthy. Your savings rate remains strong.';
  } else if (projectedBalance > 0 && savingsRateAfter >= 10) {
    recommendation = 'This is feasible but leaves less margin for unexpected expenses.';
  } else if (projectedBalance > 0) {
    recommendation = 'Possible but risky — your savings rate drops significantly.';
  } else {
    recommendation = 'Not recommended — this scenario leads to a negative balance within 12 months.';
  }

  const confidence = profile.confidence === 'high' ? 0.8 : profile.confidence === 'medium' ? 0.5 : 0.3;

  const result: ScenarioResult = {
    projectedBalance: roundMoney(projectedBalance),
    monthlyNetFlow: roundMoney(monthlyNetFlow),
    emergencyFundImpact,
    savingsRateChange,
    goalDelays,
    recommendation,
    confidence,
  };

  await prisma.scenario.create({
    data: {
      userId,
      name: input.name,
      scenarioType: input.scenarioType,
      input: input.input as unknown as Prisma.InputJsonValue,
      result: result as unknown as Prisma.InputJsonValue,
      recommendation,
      confidence,
    },
  });

  return result;
}

export async function getUserScenarios(userId: string) {
  return prisma.scenario.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getScenario(userId: string, scenarioId: string) {
  return prisma.scenario.findFirst({
    where: { id: scenarioId, userId },
  });
}

export async function deleteScenario(userId: string, scenarioId: string) {
  return prisma.scenario.deleteMany({
    where: { id: scenarioId, userId },
  });
}
