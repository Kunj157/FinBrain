import { Brain, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownMessage } from '@/components/advisor/markdown-message';
import type { AdvisorChatMessage } from '@/hooks/use-advisor-chat';

interface ChatBubbleProps {
  message: AdvisorChatMessage;
  onRetry?: () => void;
  /** Extra content below the reply, e.g. an affordability breakdown. */
  children?: React.ReactNode;
}

/**
 * One turn of an advisor conversation.
 *
 * Shared so the dashboard and insights panels cannot drift back into rendering
 * replies as raw text or dressing a failure up as advice.
 */
export function ChatBubble({ message, onRetry, children }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : message.isError
              ? 'bg-rose-500/5 border border-rose-500/20'
              : 'glass'
        }`}
      >
        {!isUser && !message.isError && (
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-medium text-emerald-400">Advisor</span>
            {message.confidence && <ConfidenceBadge confidence={message.confidence} />}
          </div>
        )}

        {message.isError ? (
          // Labelled as a failure. Branding it as the advisor made an outage
          // read as financial advice.
          <div role="alert" className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden="true" />
              <span className="text-xs font-medium text-rose-400">Couldn't get a response</span>
            </div>
            <p className="text-sm text-muted-foreground">{message.content}</p>
            {onRetry && (
              <Button variant="outline" size="sm" className="h-7" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        ) : isUser ? (
          // break-words so an unbroken token — a pasted URL or account number
          // — wraps instead of stretching the pane sideways.
          <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <>
            <MarkdownMessage content={message.content} />
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-emerald-400/70 align-middle" />
            )}
          </>
        )}

        {children}
      </div>
    </div>
  );
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] ${CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.low}`}
      title="How much of your financial history this answer is based on"
    >
      {confidence} confidence
    </span>
  );
}
