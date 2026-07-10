import { Router, type Request, type Response } from 'express';
import { checkHealth, createCustomer, createAccount, getAccounts, getTransactions, generateSampleData } from '../services/devbank';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const healthy = await checkHealth();
  if (healthy) {
    res.json({ success: true, data: { status: 'connected' } });
  } else {
    res.json({ success: false, data: { status: 'unavailable' }, message: 'DevBank service is not running. Start it with docker compose up devbank.' });
  }
});

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const customer = await createCustomer(name, email);
    const account = await createAccount(customer.id);
    await generateSampleData(customer.id);

    res.json({
      success: true,
      data: { customerId: customer.id, account },
      message: 'DevBank customer created with sample data. Run transaction engine to start generating activity.',
    });
  } catch (error) {
    console.error('DevBank setup error:', error);
    res.status(500).json({ success: false, error: 'Failed to set up DevBank. Is the service running?' });
  }
});

router.get('/accounts/:customerId', async (req: Request, res: Response) => {
  try {
    const accounts = await getAccounts(req.params.customerId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
});

router.get('/transactions/:accountId', async (req: Request, res: Response) => {
  try {
    const transactions = await getTransactions(req.params.accountId, Number(req.query.limit) || 100);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

export default router;