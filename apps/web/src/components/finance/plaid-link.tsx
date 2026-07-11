import { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface PlaidLinkProps {
  userId: string;
  onSuccess?: () => void;
}

export function PlaidLinkButton({ userId, onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'token' | 'syncing' | 'done'>('idle');

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
          const items = added.map((t: any) => ({
            type: t.amount > 0 ? 'income' as const : 'expense' as const,
            amount: Math.abs(t.amount),
            currency: 'USD',
            description: t.name || '',
            merchant: t.merchantName || t.name || '',
            categoryId: '10',
            paymentMethod: 'other' as const,
            date: t.date,
            status: t.pending ? 'pending' as const : 'cleared' as const,
            isRecurring: false,
          }));
          await api.post('/transactions/bulk', { items });
        }

        setStatus('done');
        onSuccess?.();
      } catch {
        // sync failed but bank is still connected
        setStatus('done');
        onSuccess?.();
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
    : 'Connected';

  return (
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
  );
}
