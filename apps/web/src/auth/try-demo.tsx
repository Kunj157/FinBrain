import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Signs the visitor into the shared demo account in one click. The API mints
 * a short-lived Clerk sign-in ticket for that one account; no password is in
 * the bundle. `autoStart` lets a link (e.g. /sign-in?demo=1) skip the click.
 */
export function TryDemoButton({ autoStart = false }: { autoStart?: boolean }) {
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [status, setStatus] = useState<'idle' | 'loading' | 'waking' | 'error'>('idle');
  const [error, setError] = useState('');
  const started = useRef(false);

  const start = async () => {
    if (!isLoaded || !signIn || started.current) return;
    started.current = true;
    setStatus('loading');
    setError('');
    const slow = setTimeout(() => setStatus('waking'), 3000);
    try {
      const res = await fetch(`${API_URL}/demo/session`, { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data?.ticket) throw new Error(body?.error || 'The demo is not available right now.');

      const attempt = await signIn.create({ strategy: 'ticket', ticket: body.data.ticket });
      if (attempt.status !== 'complete' || !attempt.createdSessionId) throw new Error('Demo sign-in did not complete.');
      await setActive({ session: attempt.createdSessionId });
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The demo is not available right now.');
      setStatus('error');
      started.current = false;
    } finally {
      clearTimeout(slow);
    }
  };

  useEffect(() => {
    if (autoStart && isLoaded) void start();
    // start is stable enough for a one-shot trigger; re-running on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isLoaded]);

  const busy = status === 'loading' || status === 'waking';

  return (
    <div className="glass rounded-2xl p-6 space-y-3 text-center">
      <Button onClick={start} disabled={busy || !isLoaded} className="w-full h-12 text-base bg-emerald-500 hover:bg-emerald-600 text-white">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Opening the demo…' : 'Try the live demo — no sign-up'}
      </Button>
      {status === 'waking' && (
        <p className="text-xs text-muted-foreground">
          Waking the server up — it sleeps when idle on free hosting. This can take up to a minute.
        </p>
      )}
      {status === 'error' && <p className="text-xs text-red-400">{error}</p>}
      {status === 'idle' && (
        <p className="text-xs text-muted-foreground">Explore a sample account with six months of data.</p>
      )}
    </div>
  );
}
