import { Router, type Request, type Response } from 'express';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '../services/plaid';

const router = Router();

router.post('/create-link-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'FinBrain',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    });
    res.json({ success: true, data: { linkToken: response.data.link_token } });
  } catch (error) {
    console.error('Plaid link token error:', error);
    res.status(500).json({ success: false, error: 'Failed to create link token' });
  }
});

router.post('/exchange-token', async (req: Request, res: Response) => {
  try {
    const { publicToken } = req.body;
    const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const { access_token, item_id } = response.data;
    res.json({ success: true, data: { accessToken: access_token, itemId: item_id } });
  } catch (error) {
    console.error('Plaid exchange error:', error);
    res.status(500).json({ success: false, error: 'Failed to exchange token' });
  }
});

router.post('/sync-transactions', async (req: Request, res: Response) => {
  try {
    const { accessToken, cursor } = req.body;
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || undefined,
    });
    const { added, modified, removed, next_cursor } = response.data;
    res.json({
      success: true,
      data: {
        added: added.map((t) => ({
          transactionId: t.transaction_id,
          amount: t.amount,
          date: t.date,
          name: t.name,
          merchantName: t.merchant_name,
          category: t.category,
          pending: t.pending,
        })),
        modified,
        removed,
        nextCursor: next_cursor,
      },
    });
  } catch (error) {
    console.error('Plaid sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync transactions' });
  }
});

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.query;
    const response = await plaidClient.accountsGet({ access_token: accessToken as string });
    res.json({ success: true, data: response.data.accounts });
  } catch (error) {
    console.error('Plaid accounts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
});

export default router;
