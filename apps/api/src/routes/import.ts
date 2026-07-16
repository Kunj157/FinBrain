import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { prisma } from '../prisma';
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

async function parsePdfFile(filePath: string): Promise<{ records: Record<string, string>[]; openingBalance: number | null }> {
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);
  const { transactions, openingBalance } = parsePdfText(pdfData.text);
  const records = transactions.map((tx) => ({
    date: tx.date,
    amount: (tx.type === 'expense' ? -tx.amount : tx.amount).toString(),
    description: tx.description,
    merchant: tx.merchant,
    type: tx.type,
  }));
  return { records, openingBalance };
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

async function enrichTransaction(userId: string, record: Record<string, string>) {
  const mapped = normalizeColumnNames(record);
  const merchant = mapped.merchant || mapped.vendor || mapped.payee || '';
  const description = mapped.description || mapped.name || mapped.memo || '';
  const detectedCategory = await suggestCategoryWithML(userId, merchant, description);
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

async function resolveCategoryId(categoryName: string | null, catByName: Map<string, string>): Promise<string | null> {
  if (!categoryName) return null;
  return catByName.get(categoryName) || catByName.get('Other') || null;
}

router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const categories = await prisma.category.findMany({ where: { userId: req.userId } });
    const catByName = new Map(categories.map((c) => [c.name, c.id]));

    let transactions: Awaited<ReturnType<typeof enrichTransaction>>[];
    let format: 'csv' | 'pdf';

    if (isPdf(file)) {
      const { records, openingBalance } = await parsePdfFile(file.path);
      transactions = await Promise.all(records.map((r) => enrichTransaction(req.userId, r)));
      format = 'pdf';
      (req as any)._openingBalance = openingBalance;
    } else {
      const records = await parseCsv(file.path);
      transactions = await Promise.all(records.map((r) => enrichTransaction(req.userId, r)));
      format = 'csv';
    }

    fs.unlinkSync(file.path);

    const resolved = await Promise.all(transactions.map(async (tx) => ({
      ...tx,
      categoryId: await resolveCategoryId(tx.category, catByName),
    })));

    const openingBalance = (req as any)._openingBalance as number | null;

    res.json({
      success: true,
      data: {
        format,
        total: resolved.length,
        preview: resolved,
        openingBalance,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse file' });
  }
});

router.post('/suggest-category', async (req: Request, res: Response) => {
  const { merchant, description } = req.body;
  if (!merchant && !description) {
    return res.status(400).json({ success: false, error: 'Merchant or description required' });
  }

  const result = await suggestCategoryWithML(req.userId, merchant || '', description || '');
  res.json({ success: true, data: result });
});

router.post('/suggest-batch', async (req: Request, res: Response) => {
  const { transactions } = req.body as { transactions: { merchant: string; description: string }[] };
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ success: false, error: 'Transactions array required' });
  }

  const suggestions = await Promise.all(transactions.map(async (tx) => ({
    ...tx,
    suggestion: await suggestCategoryWithML(req.userId, tx.merchant || '', tx.description || ''),
  })));

  res.json({ success: true, data: suggestions });
});

export default router;
