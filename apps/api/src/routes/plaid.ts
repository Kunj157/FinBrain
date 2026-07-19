import { Router, type Request, type Response } from 'express';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '../services/plaid';
import { prisma } from '../prisma';

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

router.post('/sync-accounts', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    const response = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccounts = response.data.accounts;

    const PLAID_TYPE_MAP: Record<string, 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other'> = {
      depository: 'checking',
      credit: 'credit',
      investment: 'investment',
      loan: 'loan',
      other: 'other',
    };

    const SUBTYPE_MAP: Record<string, 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other'> = {
      checking: 'checking',
      savings: 'savings',
      'cd': 'savings',
      'money market': 'savings',
      'credit card': 'credit',
      'student loan': 'loan',
      'mortgage': 'loan',
      'auto loan': 'loan',
      brokerage: 'investment',
      'mutual fund': 'investment',
    };

    const created: string[] = [];

    for (const acct of plaidAccounts) {
      const existing = await prisma.account.findFirst({
        where: { userId: req.userId, name: acct.name },
      });

      const accountType = SUBTYPE_MAP[acct.subtype || ''] || PLAID_TYPE_MAP[acct.type] || 'other';
      const balance = acct.balances.current ?? 0;

      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: { balance, isActive: true },
        });
      } else {
        await prisma.account.create({
          data: {
            name: acct.name,
            type: accountType,
            balance,
            currency: (acct.balances.iso_currency_code || 'USD') as 'USD',
            institution: acct.official_name || acct.name,
            userId: req.userId,
          },
        });
        created.push(acct.name);
      }
    }

    res.json({ success: true, data: { accounts: plaidAccounts.length, created } });
  } catch (error) {
    console.error('Plaid sync accounts error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync accounts' });
  }
});

export default router;
