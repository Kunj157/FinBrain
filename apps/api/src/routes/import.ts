import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { suggestCategory } from '../services/auto-categorize';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const content = fs.readFileSync(file.path, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const columnMap: Record<string, string> = {
      date: 'date',
      amount: 'amount',
      description: 'description',
      merchant: 'merchant',
      category: 'category',
      type: 'type',
    };

    const transactions = records.map((record) => {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(record)) {
        const normalizedKey = columnMap[key.toLowerCase()] || key.toLowerCase();
        mapped[normalizedKey] = value;
      }

      const merchant = mapped.merchant || mapped.vendor || mapped.payee || '';
      const description = mapped.description || mapped.name || mapped.memo || '';
      const detectedCategory = suggestCategory(merchant, description);

      return {
        date: mapped.date || '',
        amount: parseFloat(mapped.amount) || 0,
        description,
        merchant,
        category: mapped.category || detectedCategory?.categoryName || 'Uncategorized',
        categoryId: detectedCategory?.categoryId || null,
        type: mapped.amount && parseFloat(mapped.amount) >= 0 ? 'income' : 'expense',
      };
    });

    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        total: transactions.length,
        preview: transactions.slice(0, 10),
        columns: records.length > 0 ? Object.keys(records[0]) : [],
        suggestedMapping: columnMap,
      },
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse CSV' });
  }
});

router.post('/suggest-category', (req: Request, res: Response) => {
  const { merchant, description } = req.body;
  if (!merchant && !description) {
    return res.status(400).json({ success: false, error: 'Merchant or description required' });
  }

  const result = suggestCategory(merchant || '', description || '');
  res.json({ success: true, data: result });
});

router.post('/suggest-batch', (req: Request, res: Response) => {
  const { transactions } = req.body as { transactions: { merchant: string; description: string }[] };
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ success: false, error: 'Transactions array required' });
  }

  const suggestions = transactions.map((tx) => ({
    ...tx,
    suggestion: suggestCategory(tx.merchant || '', tx.description || ''),
  }));

  res.json({ success: true, data: suggestions });
});

export default router;
