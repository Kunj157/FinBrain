import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const createHoldingSchema = z.object({
  portfolioId: z.string(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  avgCostBasis: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).default('USD'),
  assetType: z.enum(['stock', 'etf', 'bond', 'mutual_fund', 'crypto', 'other']).default('stock'),
});

const updateHoldingSchema = createHoldingSchema.omit({ portfolioId: true }).partial();

router.get('/portfolios', async (req: Request, res: Response) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.userId },
    include: {
      holdings: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const enriched = portfolios.map((p) => {
    const totalValue = p.holdings.reduce((sum, h) => sum + h.quantity * (h.currentPrice || h.avgCostBasis), 0);
    const totalCost = p.holdings.reduce((sum, h) => sum + h.quantity * h.avgCostBasis, 0);
    const gainLoss = totalValue - totalCost;
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return {
      ...p,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      gainLoss: Math.round(gainLoss * 100) / 100,
      gainLossPct: Math.round(gainLossPct * 100) / 100,
      holdingCount: p.holdings.length,
    };
  });

  res.json({ success: true, data: enriched });
});

router.get('/portfolios/:id', async (req: Request, res: Response) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { holdings: true },
  });

  if (!portfolio) {
    return res.status(404).json({ success: false, error: 'Portfolio not found' });
  }

  const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.quantity * (h.currentPrice || h.avgCostBasis), 0);
  const totalCost = portfolio.holdings.reduce((sum, h) => sum + h.quantity * h.avgCostBasis, 0);

  const allocation = portfolio.holdings.map((h) => {
    const value = h.quantity * (h.currentPrice || h.avgCostBasis);
    return {
      symbol: h.symbol,
      name: h.name,
      value: Math.round(value * 100) / 100,
      percentage: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 100 : 0,
      gainLoss: Math.round((value - h.quantity * h.avgCostBasis) * 100) / 100,
      assetType: h.assetType,
    };
  });

  res.json({
    success: true,
    data: {
      ...portfolio,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      gainLoss: Math.round((totalValue - totalCost) * 100) / 100,
      allocation,
    },
  });
});

router.post('/portfolios', async (req: Request, res: Response) => {
  const parsed = createPortfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const portfolio = await prisma.portfolio.create({
    data: { ...parsed.data, userId: req.userId },
  });

  res.status(201).json({ success: true, data: portfolio });
});

router.post('/holdings', async (req: Request, res: Response) => {
  const parsed = createHoldingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: parsed.data.portfolioId, userId: req.userId },
  });
  if (!portfolio) {
    return res.status(404).json({ success: false, error: 'Portfolio not found' });
  }

  const holding = await prisma.holding.create({
    data: parsed.data,
  });

  res.status(201).json({ success: true, data: holding });
});

router.put('/holdings/:id', async (req: Request, res: Response) => {
  const existing = await prisma.holding.findFirst({
    where: { id: req.params.id },
    include: { portfolio: true },
  });
  if (!existing || existing.portfolio.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Holding not found' });
  }

  const parsed = updateHoldingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const holding = await prisma.holding.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: holding });
});

router.delete('/holdings/:id', async (req: Request, res: Response) => {
  const existing = await prisma.holding.findFirst({
    where: { id: req.params.id },
    include: { portfolio: true },
  });
  if (!existing || existing.portfolio.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Holding not found' });
  }

  await prisma.holding.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Holding deleted' });
});

router.get('/summary', async (req: Request, res: Response) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.userId },
    include: { holdings: true },
  });

  let totalValue = 0;
  let totalCost = 0;
  const byType: Record<string, number> = {};

  for (const p of portfolios) {
    for (const h of p.holdings) {
      const value = h.quantity * (h.currentPrice || h.avgCostBasis);
      const cost = h.quantity * h.avgCostBasis;
      totalValue += value;
      totalCost += cost;
      byType[h.assetType] = (byType[h.assetType] || 0) + value;
    }
  }

  const allocation = Object.entries(byType).map(([type, value]) => ({
    type,
    value: Math.round(value * 100) / 100,
    percentage: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 100 : 0,
  }));

  res.json({
    success: true,
    data: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      gainLoss: Math.round((totalValue - totalCost) * 100) / 100,
      gainLossPct: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 10000) / 100 : 0,
      portfolioCount: portfolios.length,
      holdingCount: portfolios.reduce((sum, p) => sum + p.holdings.length, 0),
      allocation,
    },
  });
});

export default router;
