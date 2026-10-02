import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { CURRENCIES, convert, getRateTable } from '../services/exchange-rates';

const router = Router();

const querySchema = z.object({
  from: z.enum(CURRENCIES),
  to: z.enum(CURRENCIES),
  amount: z.coerce.number().positive().optional(),
});

/**
 * `updatedAt` used to be `new Date()` on every response, which presented a
 * hardcoded table as current. It now carries the date the rates are actually
 * for, and `stale` says whether the provider was reachable.
 */
router.get('/rates', async (_req: Request, res: Response) => {
  const table = await getRateTable();
  res.json({
    success: true,
    data: {
      base: table.base,
      rates: table.rates,
      asOf: table.asOf,
      source: table.source,
      stale: table.stale,
      updatedAt: table.asOf,
    },
  });
});

router.get('/convert', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid parameters', details: parsed.error.format() });
  }

  const { from, to, amount } = parsed.data;
  const table = await getRateTable();

  // Derived from the USD table rather than looked up per pair, so the rate
  // here and its reciprocal always agree.
  const rate = convert(1, from, to, table.rates);
  const converted = amount ? Math.round(convert(amount, from, to, table.rates) * 100) / 100 : undefined;

  res.json({
    success: true,
    data: {
      from,
      to,
      rate,
      amount,
      converted,
      asOf: table.asOf,
      source: table.source,
      stale: table.stale,
      updatedAt: table.asOf,
    },
  });
});

export default router;
