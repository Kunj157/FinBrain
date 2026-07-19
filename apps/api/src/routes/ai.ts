import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

async function buildFinancialContext(userId: string) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [transactions, budgets, goals, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: sixMonthsAgo } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.account.findMany({ where: { userId } }),
  ]);

  const recentThreeMonths = transactions.filter((t) => new Date(t.date) >= threeMonthsAgo);

  const thisMonth = recentThreeMonths.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const lastMonth = recentThreeMonths.filter((t) => {
    const d = new Date(t.date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const thisMonthIncome = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const thisMonthExpenses = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastMonthIncome = lastMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastMonthExpenses = lastMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  const savingsRate = thisMonthIncome > 0
    ? ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome * 100).toFixed(1)
    : '0';

  const avgMonthlyExpenses = recentThreeMonths.length > 0
    ? recentThreeMonths.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0) / 3
    : 0;

  const catExpenses: Record<string, number> = {};
  for (const t of thisMonth.filter((t) => t.type === 'expense')) {
    const name = t.category?.name || 'Other';
    catExpenses[name] = (catExpenses[name] || 0) + Math.abs(t.amount);
  }

  const topCategories = Object.entries(catExpenses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));

  const recurring = transactions.filter((t) => t.isRecurring);
  const recurringTotal = recurring.reduce((s, t) => s + Math.abs(t.amount), 0);

  const accountsSummary = accounts.map((a) => ({
    name: a.name,
    type: a.type,
    balance: a.balance,
    currency: a.currency,
  }));

  const totalAssets = accounts
    .filter((a) => ['checking', 'savings', 'investment', 'real_estate'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => ['credit', 'loan'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);

  const budgetsSummary = budgets.map((b) => ({
    category: b.category?.name || 'Unknown',
    limit: b.amount,
    spent: b.spent,
    utilization: b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0,
  }));

  const goalsSummary = goals.map((g) => ({
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
    deadline: g.deadline?.toISOString().split('T')[0] || null,
    type: g.goalType,
  }));

  const monthsOfRunway = avgMonthlyExpenses > 0
    ? (totalAssets / avgMonthlyExpenses).toFixed(1)
    : 'N/A';

  return {
    summary: {
      monthlyIncome: Math.round(thisMonthIncome * 100) / 100,
      monthlyExpenses: Math.round(thisMonthExpenses * 100) / 100,
      savingsRate: `${savingsRate}%`,
      avgMonthlyExpenses: Math.round(avgMonthlyExpenses * 100) / 100,
      netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      monthsOfRunway,
    },
    incomeVsExpenses: {
      thisMonth: { income: Math.round(thisMonthIncome * 100) / 100, expenses: Math.round(thisMonthExpenses * 100) / 100 },
      lastMonth: { income: Math.round(lastMonthIncome * 100) / 100, expenses: Math.round(lastMonthExpenses * 100) / 100 },
    },
    topSpendingCategories: topCategories,
    budgets: budgetsSummary,
    goals: goalsSummary,
    recurringExpenses: {
      count: recurring.length,
      totalMonthly: Math.round(recurringTotal * 100) / 100,
    },
    accounts: accountsSummary,
    recentTransactions: transactions.slice(0, 20).map((t) => ({
      date: t.date.toISOString().split('T')[0],
      description: t.merchant || t.description,
      amount: t.amount,
      type: t.type,
      category: t.category?.name || 'Other',
    })),
  };
}

const SYSTEM_PROMPT = `You are FinBrain, a personal financial advisor AI. You have access to the user's complete financial data and your job is to help them make informed financial decisions.

Your role:
- Answer questions about their financial situation with specific numbers
- Provide prescriptive advice ("what should I do") not just descriptive ("what happened")
- Consider impact on goals, savings rate, emergency fund, and cash flow
- Give concrete recommendations with alternatives
- Be honest about trade-offs

Response format:
- Lead with a direct answer (yes/no/it depends)
- Provide financial reasoning with specific numbers from their data
- Show impact analysis (effect on goals, savings, runway)
- Suggest alternatives if applicable
- Keep responses concise but thorough

Privacy: You have access to their financial data for this conversation only. Do not suggest they share sensitive information.`;

async function callLLM(baseUrl: string, apiKey: string, model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LLM API error:', error);
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || 'No response generated.';
}

router.post('/chat', async (req: Request, res: Response) => {
  const schema = z.object({
    message: z.string().min(1).max(2000),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { message, history } = parsed.data;

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured. Set GROQ_API_KEY (free) in apps/api/.env — get one at console.groq.com',
    });
  }

  const context = await buildFinancialContext(req.userId);
  const contextStr = JSON.stringify(context, null, 2);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Here is my complete financial context:\n\n${contextStr}` },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  try {
    let reply: string;

    if (groqKey) {
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      reply = await callLLM('https://api.groq.com/openai/v1', groqKey, model, messages);
    } else {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      reply = await callLLM('https://api.openai.com/v1', openaiKey!, model, messages);
    }

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate response. Check API key and try again.' });
  }
});

router.get('/context', async (req: Request, res: Response) => {
  const context = await buildFinancialContext(req.userId);
  res.json({ success: true, data: context });
});

export default router;
