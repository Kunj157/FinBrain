import { Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownMessage } from '@/components/advisor/markdown-message';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { cn } from '@/lib/utils';
import type { AdvisorChatMessage } from '@/hooks/use-advisor-chat';

interface ChatBubbleProps {
  message: AdvisorChatMessage;
  onRetry?: () => void;
  /** Extra content below the reply, e.g. an affordability breakdown. */
  children?: React.ReactNode;
}

/** The assistant's mark: an iris tile with a soft halo. */
export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-gradient-to-br from-accent/25 to-primary/15 text-accent shadow-edge',
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

/** Shown in place of a reply until its first token arrives. */
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status">
      <AssistantAvatar />
      <div className="rounded-2xl rounded-tl-md border bg-card/80 px-4 py-2.5 shadow-edge">
        <TextShimmer className="text-sm font-medium">Thinking through your numbers…</TextShimmer>
      </div>
    </div>
  );
}

const CONFIDENCE_VARIANT: Record<string, string> = {
  high: 'border-positive/20 bg-positive/10 text-positive',
  medium: 'border-warning/20 bg-warning/10 text-warning',
  low: 'border-negative/20 bg-negative/10 text-negative',
};

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
        CONFIDENCE_VARIANT[confidence] || CONFIDENCE_VARIANT.low,
      )}
      title="How much of your financial history this answer is based on"
    >
      {confidence} confidence
    </span>
  );
}

/** A failed turn, labelled as a failure. Branding it as the advisor made an outage read as advice. */
export function ChatError({ content, onRetry }: { content: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-md border border-negative/25 bg-negative/[0.06] px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-negative" aria-hidden="true" />
        <span className="text-xs font-semibold text-negative">Couldn't get a response</span>
      </div>
      <p className="text-sm text-muted-foreground">{content}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="h-7" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * One turn of an advisor conversation.
 *
 * Shared so the dashboard and insights panels cannot drift back into rendering
 * replies as raw text or dressing a failure up as advice.
 */
export function ChatBubble({ message, onRetry, children }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        {/* break-words so an unbroken token — a pasted URL or account number —
            wraps instead of stretching the pane sideways. */}
        <div className="min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2)]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex justify-start">
        <ChatError content={message.content} onRetry={onRetry} />
      </div>
    );
  }

  if (message.isStreaming && !message.content) return <ThinkingIndicator />;

  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar className="mt-0.5" />
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md border bg-card/80 px-4 py-3 shadow-edge [background-image:var(--sheen)]">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-accent">Advisor</span>
          {message.confidence && <ConfidenceBadge confidence={message.confidence} />}
        </div>
        <MarkdownMessage content={message.content} />
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-accent/70 align-middle" />
        )}
        {children}
      </div>
    </div>
  );
}
