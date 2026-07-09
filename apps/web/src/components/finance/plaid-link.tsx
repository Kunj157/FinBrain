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
  const [connected, setConnected] = useState(false);

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/plaid/create-link-token', { userId });
      setLinkToken(data.data.linkToken);
    } catch {
      setLoading(false);
    }
  }, [userId]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      try {
        await api.post('/plaid/exchange-token', { publicToken });
        setConnected(true);
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

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <Check className="h-4 w-4" />
        Bank connected
      </div>
    );
  }

  return (
    <Button
      onClick={async () => {
        if (!linkToken) {
          await generateToken();
        }
        open();
      }}
      disabled={loading || !ready}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Building2 className="h-4 w-4" />
      )}
      {loading ? 'Connecting...' : 'Connect your bank'}
    </Button>
  );
}
