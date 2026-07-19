import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    periods: z.number().min(1).max(24).default(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { periods } = parsed.data;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 12);

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId, deletedAt: null, date: { gte: sixMonthsAgo } },
    orderBy: { date: 'asc' },
  });

  if (transactions.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Need at least 3 months of transaction data for forecasting',
    });
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: transactions.map((t) => ({
          date: t.date.toISOString(),
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
        })),
        periods,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ML forecast error:', error);
      return res.status(502).json({ success: false, error: 'Forecast service unavailable' });
    }

    const result = await response.json() as { data: unknown };
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('Forecast error:', err);

    const monthlyData = aggregateMonthly(transactions);
    const forecast = computeLocalForecast(monthlyData, periods);
    res.json({ success: true, data: forecast });
  }
});

router.get('/monthly-series', async (req: Request, res: Response) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId, deletedAt: null, date: { gte: twelveMonthsAgo } },
    orderBy: { date: 'asc' },
  });

  const series = aggregateMonthly(transactions);
  res.json({ success: true, data: series });
});

function aggregateMonthly(transactions: Array<{ date: Date; amount: number; type: string }>) {
  const monthlyIncome: Record<string, number> = {};
  const monthlyExpense: Record<string, number> = {};

  for (const txn of transactions) {
    const d = new Date(txn.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const amount = Math.abs(txn.amount);

    if (txn.type === 'income') {
      monthlyIncome[key] = (monthlyIncome[key] || 0) + amount;
    } else {
      monthlyExpense[key] = (monthlyExpense[key] || 0) + amount;
    }
  }

  const allMonths = [...new Set([...Object.keys(monthlyIncome), ...Object.keys(monthlyExpense)])].sort();

  return {
    income: {
      dates: allMonths,
      values: allMonths.map((m) => Math.round((monthlyIncome[m] || 0) * 100) / 100),
    },
    expense: {
      dates: allMonths,
      values: allMonths.map((m) => Math.round((monthlyExpense[m] || 0) * 100) / 100),
    },
    net: {
      dates: allMonths,
      values: allMonths.map((m) => Math.round(((monthlyIncome[m] || 0) - (monthlyExpense[m] || 0)) * 100) / 100),
    },
  };
}

function computeLocalForecast(series: { income: { dates: string[]; values: number[] }; expense: { dates: string[]; values: number[] }; net: { dates: string[]; values: number[] } }, periods: number) {
  const results: Record<string, unknown> = {};

  for (const key of ['income', 'expense', 'net'] as const) {
    const values = series[key].values;
    const lastValues = values.slice(-6);
    const avg = lastValues.length > 0 ? lastValues.reduce((a, b) => a + b, 0) / lastValues.length : 0;

    const forecast: number[] = [];
    for (let i = 0; i < periods; i++) {
      forecast.push(Math.round(avg * 100) / 100);
    }

    results[key] = {
      historical: series[key],
      models: {
        moving_average: { forecast, model: 'moving_average', accuracy: null },
        linear_regression: { forecast, model: 'linear_regression', accuracy: null },
        arima: { forecast: [], model: 'arima', accuracy: null, error: 'ML service unavailable' },
        prophet: { forecast: [], model: 'prophet', accuracy: null, error: 'ML service unavailable' },
      },
    };
  }

  return { monthly_series: series, forecasts: results, periods };
}

export default router;
