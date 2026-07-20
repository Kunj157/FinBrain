import { prisma } from '../../prisma';
import { roundMoney, computeTotalAssets } from '../finance-math';
import { getAdvisorProfile } from './profile-engine';
import { evaluateAffordability, type AffordabilityInput, type AffordabilityDecision } from './recommendation-rules';
import { parsePurchaseMessage, type ParsedPurchase } from './purchase-parser';

export async function runAffordabilityCheck(
  userId: string,
  purchase: ParsedPurchase,
): Promise<AffordabilityDecision> {
  const profile = await getAdvisorProfile(userId);
  if (!profile) {
    return {
      decision: 'insufficient_data',
      confidence: 0.1,
      summary: 'No financial profile available. Please import transactions first.',
      assumedPurchaseAmount: purchase.amount || 0,
      currentCashAvailable: 0,
      projectedBalances: [],
      impact: {
        emergencyFundMonthsBefore: 0,
        emergencyFundMonthsAfter: 0,
        savingsRateBefore: 0,
        savingsRateAfter: 0,
        budgetImpact: [],
        goalDelays: [],
      },
      reasons: ['No financial data available'],
      alternatives: ['Import transactions to enable advisor'],
      nextBestActions: ['Connect bank accounts or import CSV'],
    };
  }

  const accounts = await prisma.account.findMany({ where: { userId } });
  const currentBalance = accounts
    .filter((a) => a.type === 'checking')
    .reduce((s, a) => s + a.balance, 0);

  const savingsBalance = accounts
    .filter((a) => a.type === 'savings')
    .reduce((s, a) => s + a.balance, 0);

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: { select: { name: true } } },
  });

  const budgetUtilizations = budgets.map((b) => ({
    category: b.category?.name || 'Unknown',
    limit: b.amount,
    spent: b.spent,
  }));

  const goals = await prisma.goal.findMany({ where: { userId } });
  const goalData = goals.map((g) => ({
    id: g.id,
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    deadline: g.deadline,
  }));

  const amount = purchase.amount || estimateAmount(purchase.itemName, profile.monthlyExpenseAvg);

  const input: AffordabilityInput = {
    itemName: purchase.itemName,
    amount,
    currency: purchase.currency,
    paymentMethod: purchase.paymentMethod,
    financingMonths: purchase.financingMonths,
    financingApr: purchase.financingApr,
    priority: purchase.priority,
  };

  return evaluateAffordability(input, profile, currentBalance, savingsBalance, budgetUtilizations, goalData);
}

function estimateAmount(itemName: string, avgMonthlyExpenses: number): number {
  const knownPrices: Record<string, number> = {
    'iphone': 1199,
    'iphone 17': 1199,
    'iphone 17 pro': 1199,
    'iphone 17 pro max': 1399,
    'macbook': 1299,
    'macbook pro': 1999,
    'ipad': 599,
    'airpods': 249,
    'car': 25000,
    'vacation': 3000,
    'holiday': 2000,
    'laptop': 899,
    'desktop': 1299,
    'monitor': 499,
    'tv': 699,
    'sofa': 1200,
    'bed': 800,
    'washer': 799,
    'dryer': 699,
    'fridge': 1199,
    'dishwasher': 599,
  };

  const lower = itemName.toLowerCase();
  for (const [key, price] of Object.entries(knownPrices)) {
    if (lower.includes(key)) return price;
  }

  return Math.round(avgMonthlyExpenses * 0.3 * 100) / 100;
}

export async function handleAffordabilityFromChat(
  userId: string,
  message: string,
): Promise<{ decision: AffordabilityDecision; parsed: ParsedPurchase }> {
  const parsed = parsePurchaseMessage(message);
  const decision = await runAffordabilityCheck(userId, parsed);
  return { decision, parsed };
}
