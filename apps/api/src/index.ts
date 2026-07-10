import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import plaidRoutes from './routes/plaid';
import csvImportRoutes from './routes/import';
import currencyRoutes from './routes/currency';
import receiptsRoutes from './routes/receipts';
import devbankRoutes from './routes/devbank';
import transactionsRoutes from './routes/transactions';
import categoriesRoutes from './routes/categories';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'finbrain-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1/plaid', plaidRoutes);
app.use('/api/v1/import', csvImportRoutes);
app.use('/api/v1/currency', currencyRoutes);
app.use('/api/v1/receipts', receiptsRoutes);
app.use('/api/v1/devbank', devbankRoutes);
app.use('/api/v1/transactions', transactionsRoutes);
app.use('/api/v1/categories', categoriesRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`FinBrain API running on port ${PORT}`);
});

export default app;
