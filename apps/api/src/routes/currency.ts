import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const router = Router();

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'] as const;
type Currency = (typeof CURRENCIES)[number];

const rates: Record<Currency, Record<Currency, number>> = {
  USD: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 157.3, CAD: 1.37, AUD: 1.52 },
  EUR: { USD: 1.09, EUR: 1, GBP: 0.86, INR: 90.8, JPY: 171.1, CAD: 1.49, AUD: 1.65 },
  GBP: { USD: 1.27, EUR: 1.16, GBP: 1, INR: 105.7, JPY: 199.1, CAD: 1.73, AUD: 1.92 },
  INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, INR: 1, JPY: 1.88, CAD: 0.016, AUD: 0.018 },
  JPY: { USD: 0.0064, EUR: 0.0058, GBP: 0.0050, INR: 0.53, JPY: 1, CAD: 0.0087, AUD: 0.0097 },
  CAD: { USD: 0.73, EUR: 0.67, GBP: 0.58, INR: 61.0, JPY: 114.8, CAD: 1, AUD: 1.11 },
  AUD: { USD: 0.66, EUR: 0.60, GBP: 0.52, INR: 55.1, JPY: 103.6, CAD: 0.90, AUD: 1 },
};

const querySchema = z.object({
  from: z.enum(CURRENCIES),
  to: z.enum(CURRENCIES),
  amount: z.coerce.number().positive().optional(),
});

router.get('/rates', (_req: Request, res: Response) => {
  res.json({ success: true, data: { base: 'USD', rates: rates.USD, updatedAt: new Date().toISOString() } });
});

router.get('/convert', (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid parameters', details: parsed.error.format() });
  }

  const { from, to, amount } = parsed.data;
  const rate = rates[from][to];
  const converted = amount ? Math.round(amount * rate * 100) / 100 : undefined;

  res.json({
    success: true,
    data: { from, to, rate, amount, converted, updatedAt: new Date().toISOString() },
  });
});

export default router;