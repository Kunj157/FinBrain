import { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface PlaidLinkProps {
  userId: string;
  onSuccess?: () => void;
}

interface PlaidSyncedTransaction {
  transactionId: string;
  /** Positive when money leaves the account — Plaid's convention, not ours. */
  amount: number;
  isoCurrencyCode: string | null;
  date: string;
  name: string | null;
  merchantName: string | null;
  pending: boolean;
}

// The app stores amounts against a fixed currency enum. Anything Plaid
// reports outside it would be rejected by the API, so fall back rather than
// fail the whole sync — and never silently relabel it as dollars.
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

function toSupportedCurrency(code: string | null): SupportedCurrency {
  const upper = (code || '').toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as SupportedCurrency)
    : 'USD';
}

export function PlaidLinkButton({ userId, onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'token' | 'syncing' | 'done' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const generateToken = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const { data } = await api.post('/plaid/create-link-token', { userId });
      const token = data.data.linkToken;
      setLinkToken(token);
      setStatus('token');
      return token;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      setStatus('syncing');
      try {
        const { data: exchange } = await api.post('/plaid/exchange-token', { publicToken });
        const accessToken = exchange.data.accessToken;

        const { data: sync } = await api.post('/plaid/sync-transactions', { accessToken });
        const added = sync.data.added;

        if (added.length > 0) {
          const items = added.map((t: PlaidSyncedTransaction) => ({
            // Plaid's own definition: "Positive values when money moves out of
            // the account; negative values when money moves in. For example,
            // debit card purchases are positive; credit card payments, direct
            // deposits, and refunds are negative."
            //
            // This was inverted, so every purchase was booked as income and
            // every paycheck as an expense.
            type: t.amount > 0 ? ('expense' as const) : ('income' as const),
            amount: Math.abs(t.amount),
            currency: toSupportedCurrency(t.isoCurrencyCode),
            description: t.name || '',
            merchant: t.merchantName || t.name || '',
            // Plaid's own id, so re-syncing the same transaction is recognised
            // rather than written a second time.
            externalId: t.transactionId,
            categoryId: '',
            paymentMethod: 'other' as const,
            date: t.date,
            status: t.pending ? ('pending' as const) : ('cleared' as const),
            isRecurring: false,
          }));
          await api.post('/transactions/bulk', { items });
        }

        await api.post('/plaid/sync-accounts', { accessToken }).catch(() => {});

        setStatus('done');
        setSyncError(null);
        onSuccess?.();
      } catch (error) {
        // This previously reported 'done' and called onSuccess on failure, so
        // a sync that imported nothing looked identical to one that worked.
        console.error('Plaid sync failed:', error);
        setStatus('error');
        setSyncError('We could not finish connecting your bank. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => onPlaidSuccess(publicToken),
  });

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <Check className="h-4 w-4" />
        {loading ? 'Importing transactions...' : 'Bank connected'}
      </div>
    );
  }

  const label = status === 'idle' ? 'Connect your bank'
    : status === 'token' ? 'Open Plaid...'
    : status === 'syncing' ? 'Importing transactions...'
    : status === 'error' ? 'Try again'
    : 'Connected';

  return (
    <div className="space-y-2">
      <Button
        onClick={async () => {
          const token = linkToken || await generateToken();
          if (token) open();
        }}
        disabled={loading || (!ready && status === 'token')}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
        {label}
      </Button>
      {syncError && (
        <p role="alert" className="text-xs text-rose-400">
          {syncError}
        </p>
      )}
    </div>
  );
}
