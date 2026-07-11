import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { suggestCategoryWithML } from '../services/auto-categorize';
import { parsePdfText } from '../services/pdf-parser';

const upload = multer({ dest: 'uploads/' });
const router = Router();

function isPdf(file: Express.Multer.File): boolean {
  return file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

async function parsePdfFile(filePath: string): Promise<Record<string, string>[]> {
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);
  const transactions = parsePdfText(pdfData.text);
  return transactions.map((tx) => ({
    date: tx.date,
    amount: (tx.type === 'expense' ? -tx.amount : tx.amount).toString(),
    description: tx.description,
    merchant: tx.merchant,
    type: tx.type,
  }));
}

function normalizeColumnNames(record: Record<string, string>): Record<string, string> {
  const csvColumnMap: Record<string, string> = {
    date: 'date', amount: 'amount', description: 'description',
    merchant: 'merchant', category: 'category', type: 'type',
  };
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = csvColumnMap[key.toLowerCase()] || key.toLowerCase();
    mapped[normalizedKey] = value;
  }
  return mapped;
}

async function enrichTransaction(record: Record<string, string>) {
  const mapped = normalizeColumnNames(record);
  const merchant = mapped.merchant || mapped.vendor || mapped.payee || '';
  const description = mapped.description || mapped.name || mapped.memo || '';
  const detectedCategory = await suggestCategoryWithML(merchant, description);
  const amount = parseFloat(mapped.amount) || 0;

  return {
    date: mapped.date || '',
    amount,
    description,
    merchant,
    category: mapped.category || detectedCategory?.categoryName || 'Uncategorized',
    categoryId: detectedCategory?.categoryId || null,
    type: amount >= 0 ? 'income' : 'expense',
  };
}

router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let transactions: Awaited<ReturnType<typeof enrichTransaction>>[];
    let format: 'csv' | 'pdf';

    if (isPdf(file)) {
      const records = await parsePdfFile(file.path);
      transactions = await Promise.all(records.map(enrichTransaction));
      format = 'pdf';
    } else {
      const records = await parseCsv(file.path);
      transactions = await Promise.all(records.map(enrichTransaction));
      format = 'csv';
    }

    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        format,
        total: transactions.length,
        preview: transactions.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse file' });
  }
});

// keep backward compat
router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const records = await parseCsv(file.path);
    const transactions = await Promise.all(records.map(enrichTransaction));

    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        total: transactions.length,
        preview: transactions.slice(0, 10),
        columns: records.length > 0 ? Object.keys(records[0]) : [],
      },
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse CSV' });
  }
});

router.post('/suggest-category', async (req: Request, res: Response) => {
  const { merchant, description } = req.body;
  if (!merchant && !description) {
    return res.status(400).json({ success: false, error: 'Merchant or description required' });
  }

  const result = await suggestCategoryWithML(merchant || '', description || '');
  res.json({ success: true, data: result });
});

router.post('/suggest-batch', async (req: Request, res: Response) => {
  const { transactions } = req.body as { transactions: { merchant: string; description: string }[] };
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ success: false, error: 'Transactions array required' });
  }

  const suggestions = await Promise.all(transactions.map(async (tx) => ({
    ...tx,
    suggestion: await suggestCategoryWithML(tx.merchant || '', tx.description || ''),
  })));

  res.json({ success: true, data: suggestions });
});

export default router;
