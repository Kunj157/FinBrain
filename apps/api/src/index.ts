import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'finbrain-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1/plaid', require('./routes/plaid').default);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`FinBrain API running on port ${PORT}`);
});

export default app;
