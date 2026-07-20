import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { ensureDevUser, prisma } from './prisma';
import { seedDefaultCategories } from './seed-defaults';
import { requireAuth } from './middleware/auth';
import './types';

import plaidRoutes from './routes/plaid';
import csvImportRoutes from './routes/import';
import currencyRoutes from './routes/currency';
import receiptsRoutes from './routes/receipts';
import transactionsRoutes from './routes/transactions';
import categoriesRoutes from './routes/categories';
import seedRoutes from './routes/seed';
import budgetsRoutes from './routes/budgets';
import goalsRoutes from './routes/goals';
import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import rulesRoutes from './routes/rules';
import recurringRoutes from './routes/recurring';
import searchRoutes from './routes/search';
import aiRoutes from './routes/ai';
import investmentsRoutes from './routes/investments';
import notificationsRoutes, { checkBudgetAlerts } from './routes/notifications';
import forecastRoutes from './routes/forecast';
import advisorRoutes from './routes/advisor';
import dataQualityRoutes from './routes/data-quality';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'finbrain-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1', (req, res, next) => {
  if (req.path === '/health' || !process.env.CLERK_SECRET_KEY) {
    if (!process.env.CLERK_SECRET_KEY) {
      req.userId = 'dev-user-001';
    }
    return next();
  }
  return requireAuth(req, res, next);
});

app.use('/api/v1/plaid', plaidRoutes);
app.use('/api/v1/import', csvImportRoutes);
app.use('/api/v1/currency', currencyRoutes);
app.use('/api/v1/receipts', receiptsRoutes);
app.use('/api/v1/transactions', transactionsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/seed', seedRoutes);
app.use('/api/v1/budgets', budgetsRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/rules', rulesRoutes);
app.use('/api/v1/recurring', recurringRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/investments', investmentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/forecast', forecastRoutes);
app.use('/api/v1/advisor', advisorRoutes);
app.use('/api/v1/data-quality', dataQualityRoutes);

app.get('/api/v1/audit-logs', async (req, res) => {
  const { entity, limit: l } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: entity ? { entity: entity as string, userId: req.userId } : { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(l) || 20, 100),
  });
  res.json({ success: true, data: logs });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled route error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function start() {
  await ensureDevUser();
  await seedDefaultCategories();
  console.log('Database initialized with dev user and default categories');

  app.listen(PORT, () => {
    console.log(`FinBrain API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

export default app;
