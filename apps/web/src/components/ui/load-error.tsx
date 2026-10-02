import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadErrorProps {
  /** What the user should understand went wrong, in plain language. */
  message: string;
  onRetry?: () => void;
}

/**
 * Shown when a page could not load its data.
 *
 * Pages that render financial figures must not fall back to zeros on a failed
 * request — a zero reads as "you have nothing", which is indistinguishable
 * from the truth and far worse than an honest error.
 */
export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"
    >
      <AlertCircle className="h-10 w-10 text-rose-400" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
