import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, History, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Lightbulb, Target, Shield, Sparkles, ThumbsUp, ThumbsDown, X, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { streamAdvisorChat } from '@/lib/advisor-stream';
import { MarkdownMessage } from '@/components/advisor/markdown-message';
import { AssistantAvatar, ChatError, ConfidenceBadge, ThinkingIndicator } from '@/components/advisor/chat-bubble';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { BorderTrail } from '@/components/motion/border-trail';
import { ProgressiveBlur } from '@/components/motion/progressive-blur';
import { cn, formatCurrency } from '@/lib/utils';

interface AdvisorProfile {
  confidence: string;
  monthlyIncomeAvg: number;
  monthlyExpenseAvg: number;
  savingsRateAvg: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
  riskLevel: string;
  advisorSummary: string;
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  structuredData?: Record<string, unknown>;
  /** Server id of the persisted message; required to attach feedback. */
  id?: string;
  /** Marks a failed turn so it is never presented as advice. */
  isError?: boolean;
  /** True while tokens are still arriving for this message. */
  isStreaming?: boolean;
  /** How much data this particular answer rested on. */
  confidence?: string;
}

interface AffordabilityDecision {
  decision: string;
  confidence: number;
  summary: string;
  assumedPurchaseAmount: number;
  currentCashAvailable: number;
  projectedBalances: Array<{ date: string; before: number; after: number }>;
  impact: {
    emergencyFundMonthsBefore: number;
    emergencyFundMonthsAfter: number;
    savingsRateBefore: number;
    savingsRateAfter: number;
    goalDelays: Array<{ name: string; delayDays: number }>;
    debtRisk?: string;
  };
  reasons: string[];
  alternatives: string[];
  nextBestActions: string[];
}

const decisionColors: Record<string, string> = {
  recommended: 'text-positive bg-positive/10 border-positive/20',
  reasonable: 'text-info bg-info/10 border-info/20',
  caution: 'text-warning bg-warning/10 border-warning/20',
  not_recommended: 'text-negative bg-negative/10 border-negative/20',
  insufficient_data: 'text-muted-foreground bg-muted-foreground/10 border-border-strong/20',
};

const decisionIcons: Record<string, typeof CheckCircle2> = {
  recommended: CheckCircle2,
  reasonable: CheckCircle2,
  caution: AlertTriangle,
  not_recommended: XCircle,
  insufficient_data: AlertTriangle,
};

const suggestedQuestions = [
  'Can I afford an iPhone 17 Pro Max?',
  'Should I increase my savings rate?',
  'What if my rent increases by 20%?',
  'When can I afford a vacation?',
  'How much should I have in emergency fund?',
  'Is my spending on track?',
];

export default function AdvisorPage() {
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  /** Retained so a failed turn can be retried without retyping it. */
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [, setIsProfileLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, convsRes] = await Promise.all([
        api.get('/advisor/profile'),
        api.get('/advisor/conversations'),
      ]);
      setProfile(profileRes.data.data);
      setConversations(convsRes.data.data);
    } catch {
      // silent
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const loadConversation = async (convId: string) => {
    try {
      const res = await api.get(`/advisor/conversations/${convId}`);
      const conv = res.data.data;
      setActiveConvId(convId);
      const loadedMessages: ChatMessage[] = [];
      for (const m of conv.messages) {
        loadedMessages.push({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          structuredData: m.structuredData || undefined,
        });
      }
      setMessages(loadedMessages);
      setShowHistory(false);
    } catch {
      // silent
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const msg = overrideMessage || chatInput.trim();
    if (!msg || isLoading) return;

    setChatInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg },
      // Placeholder the deltas append into, so tokens appear as they arrive
      // rather than after the whole answer is generated.
      { role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsLoading(true);
    setLastQuestion(msg);

    const assistantIndex = messages.length + 1;
    let startedConvId: string | null = activeConvId;

    const updateAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m, i) => (i === assistantIndex ? { ...m, ...patch } : m)),
      );
    };

    await streamAdvisorChat(
      { message: msg, conversationId: activeConvId },
      {
        onStart: ({ conversationId, structuredData, confidence }) => {
          startedConvId = conversationId;
          // Adopt the id immediately: without it the next message would be
          // sent with a null id and silently open a second conversation.
          if (!activeConvId) setActiveConvId(conversationId);
          if (structuredData) updateAssistant({ structuredData });
          if (confidence) updateAssistant({ confidence });
        },
        onDelta: (text) => {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIndex ? { ...m, content: m.content + text } : m,
            ),
          );
        },
        onDone: ({ messageId, structuredData, confidence }) => {
          updateAssistant({ id: messageId, structuredData, confidence, isStreaming: false });
        },
        onError: (error) => {
          // Rendered as an error, never as an assistant reply: an outage must
          // not look like the advisor answering "Failed to generate response".
          updateAssistant({ content: error, isError: true, isStreaming: false });
        },
      },
    );

    setIsLoading(false);

    if (!activeConvId && startedConvId) {
      try {
        const convsRes = await api.get('/advisor/conversations');
        setConversations(convsRes.data.data);
      } catch {
        // The thread is usable without a refreshed sidebar.
      }
    }
  };

  const handleRetry = () => {
    if (!lastQuestion) return;
    // Drop the failed exchange so the retry does not stack on a dead turn.
    setMessages((prev) => prev.slice(0, -2));
    handleSend(lastQuestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Keyed by message id so the buttons can reflect what was actually recorded.
  const [feedbackState, setFeedbackState] = useState<Record<string, 'thumbs_up' | 'thumbs_down' | 'failed'>>({});

  const handleFeedback = async (messageId: string | undefined, feedback: 'thumbs_up' | 'thumbs_down') => {
    // This used to post the message's index in the local array, which matched
    // no row on the server, so every rating was silently discarded.
    if (!messageId) return;

    setFeedbackState((prev) => ({ ...prev, [messageId]: feedback }));
    try {
      await api.post(`/advisor/messages/${messageId}/feedback`, { feedback });
    } catch {
      setFeedbackState((prev) => ({ ...prev, [messageId]: 'failed' }));
    }
  };

  const savingsTone = (rate: number) => (rate >= 20 ? 'positive' : rate >= 10 ? 'warning' : 'negative');
  const fundTone = (months: number) => (months >= 3 ? 'positive' : months >= 1 ? 'warning' : 'negative');

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col gap-5 md:h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-9.5rem)]">
      <PageHeader
        title="Advisor"
        description="Personalized guidance grounded in your own numbers"
        icon={Sparkles}
        tone="accent"
        actions={
          <>
            {profile && <ConfidenceBadge confidence={profile.confidence} />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Conversation history"
              aria-expanded={showHistory}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 gap-5">
        {showHistory && (
          <aside className="glass w-64 flex-shrink-0 overflow-y-auto rounded-2xl p-3 animate-fade-in" aria-label="Conversations">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conversations</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)} aria-label="Close history">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {conversations.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet</p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={cn(
                    'w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    activeConvId === c.id
                      ? 'bg-accent/10 text-foreground ring-1 ring-inset ring-accent/25'
                      : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
                  )}
                >
                  <p className="truncate">{c.title || 'New conversation'}</p>
                  <p className="mt-0.5 text-[11px] opacity-60">{new Date(c.updatedAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </aside>
        )}

        {profile && (
          <aside className="hidden w-72 flex-shrink-0 space-y-4 overflow-y-auto pb-1 lg:block" aria-label="Financial profile">
            <Card>
              <CardHeader>
                <CardTitle>Financial profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-foreground/[0.02] p-3">
                    <p className="text-[11px] text-muted-foreground">Monthly income</p>
                    <p className="mt-1 text-sm font-semibold">
                      <AnimatedNumber value={profile.monthlyIncomeAvg} from={0} format={(n) => formatCurrency(n)} />
                    </p>
                  </div>
                  <div className="rounded-xl border bg-foreground/[0.02] p-3">
                    <p className="text-[11px] text-muted-foreground">Monthly spend</p>
                    <p className="mt-1 text-sm font-semibold">
                      <AnimatedNumber value={profile.monthlyExpenseAvg} from={0} format={(n) => formatCurrency(n)} />
                    </p>
                  </div>
                </div>
                <ProfileMeter
                  label="Savings rate"
                  value={`${profile.savingsRateAvg.toFixed(1)}%`}
                  fill={Math.max(0, Math.min(100, profile.savingsRateAvg))}
                  tone={savingsTone(profile.savingsRateAvg)}
                />
                <ProfileMeter
                  label="Emergency fund"
                  value={`${profile.emergencyFundMonths} months`}
                  fill={Math.min(100, (profile.emergencyFundMonths / 6) * 100)}
                  tone={fundTone(profile.emergencyFundMonths)}
                />
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Risk level</span>
                  <span className="font-medium capitalize">{profile.riskLevel}</span>
                </div>
              </CardContent>
            </Card>

            {profile.advisorSummary && (
              <Card className="border-accent/20">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Summary
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{profile.advisorSummary}</p>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
                  Suggested questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-50"
                  >
                    <span className="flex-1">{q}</span>
                    <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        )}

        <section className="surface-raised relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl" aria-label="Conversation">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-8 pt-5 md:px-6">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="relative mb-5">
                  <span aria-hidden className="absolute inset-0 -z-10 scale-[2] rounded-full bg-accent/20 blur-2xl" />
                  <AssistantAvatar className="h-14 w-14 rounded-2xl [&_svg]:h-6 [&_svg]:w-6" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Ask your financial advisor</h2>
                <p className="mb-7 mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  I can help you make financial decisions based on your actual income, expenses, goals, and spending patterns.
                </p>
                <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {suggestedQuestions.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="group flex items-center gap-2 rounded-xl border bg-card/60 px-3.5 py-3 text-left text-sm shadow-edge transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.05]"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                      <span className="flex-1">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              if (msg.role === 'user') {
                return (
                  <div key={idx} className="flex justify-end">
                    {/* break-words so an unbroken token — a pasted URL or
                        account number — wraps instead of stretching the chat
                        pane sideways. */}
                    <div className="min-w-0 max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2)]">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              // A failure is labelled as one. Branding it as the advisor made
              // an outage read as financial advice.
              if (msg.isError) {
                return (
                  <div key={idx} className="flex justify-start">
                    <ChatError content={msg.content} onRetry={handleRetry} />
                  </div>
                );
              }
              // Until the first token lands, a shimmer stands in for the reply.
              if (msg.isStreaming && msg.content === '') return <ThinkingIndicator key={idx} />;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <AssistantAvatar className="mt-0.5" />
                  <div className="min-w-0 max-w-[80%] rounded-2xl rounded-tl-md border bg-card/80 px-4 py-3 shadow-edge [background-image:var(--sheen)]">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-accent">Advisor</span>
                      {/* Per answer, not per profile: how much data this
                          specific reply rested on is what the reader needs. */}
                      {msg.confidence && <ConfidenceBadge confidence={msg.confidence} />}
                    </div>
                    <MarkdownMessage content={msg.content} />
                    {msg.isStreaming && (
                      <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-accent/70 align-middle" />
                    )}

                    {msg.structuredData?.type === 'affordability' && typeof msg.structuredData.decision === 'object' && msg.structuredData.decision !== null && (
                      <AffordabilityCard decision={msg.structuredData.decision as unknown as AffordabilityDecision} />
                    )}

                    {!msg.isStreaming && msg.id && (
                      <div className="mt-2.5 flex items-center gap-1 border-t pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn('h-7 px-2', feedbackState[msg.id] === 'thumbs_up' && 'text-positive')}
                          aria-label="This answer was helpful"
                          aria-pressed={feedbackState[msg.id] === 'thumbs_up'}
                          onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn('h-7 px-2', feedbackState[msg.id] === 'thumbs_down' && 'text-negative')}
                          aria-label="This answer was not helpful"
                          aria-pressed={feedbackState[msg.id] === 'thumbs_down'}
                          onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                        {feedbackState[msg.id] === 'failed' && (
                          <span className="text-xs text-muted-foreground">Couldn't save that</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="relative border-t bg-card/60 p-3 backdrop-blur-xl md:p-4">
            <ProgressiveBlur side="bottom" className="-top-8 h-8 bottom-auto" />
            <div className="relative flex items-center gap-2 rounded-xl border border-input bg-surface-sunken/60 p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
              {isLoading && <BorderTrail tone="accent" size={90} />}
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                aria-label="Ask about your finances"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none"
                disabled={isLoading}
              />
              <Button
                variant="accent"
                size="icon"
                onClick={() => handleSend()}
                disabled={!chatInput.trim() || isLoading}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Answers are generated from your data and may be imperfect. Not professional financial advice.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileMeter({ label, value, fill, tone }: { label: string; value: string; fill: number; tone: 'positive' | 'warning' | 'negative' }) {
  const bar = { positive: 'bg-positive', warning: 'bg-warning', negative: 'bg-negative' }[tone];
  const text = { positive: 'text-positive', warning: 'text-warning', negative: 'text-negative' }[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', text)}>{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]" aria-hidden>
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', bar)} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

function AffordabilityCard({ decision }: { decision: AffordabilityDecision }) {
  const [expanded, setExpanded] = useState(false);
  const DecisionIcon = decisionIcons[decision.decision] || AlertTriangle;

  return (
    <div className="mt-3 rounded-xl border bg-foreground/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DecisionIcon className={`h-4 w-4 ${decisionColors[decision.decision]?.split(' ')[0]}`} aria-hidden />
          <span className={`text-sm font-medium capitalize ${decisionColors[decision.decision]?.split(' ')[0]}`}>
            {decision.decision.replace('_', ' ')}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(decision.confidence * 100)}% confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <span className="text-muted-foreground">Purchase Amount</span>
          <p className="font-medium">{formatCurrency(decision.assumedPurchaseAmount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Current Cash</span>
          <p className="font-medium">{formatCurrency(decision.currentCashAvailable)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Emergency Fund</span>
          <p className="font-medium">{decision.impact.emergencyFundMonthsBefore} → {decision.impact.emergencyFundMonthsAfter} months</p>
        </div>
        <div>
          <span className="text-muted-foreground">Savings Rate</span>
          <p className="font-medium">{decision.impact.savingsRateBefore.toFixed(1)}% → {decision.impact.savingsRateAfter.toFixed(1)}%</p>
        </div>
      </div>

      {decision.reasons.length > 0 && (
        <div className="space-y-1 mb-2">
          {decision.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-3 w-3 mt-0.5 text-warning flex-shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {decision.impact.goalDelays.length > 0 && (
        <div className="space-y-1 mb-2">
          {decision.impact.goalDelays.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Target className="h-3 w-3 text-info flex-shrink-0" />
              <span>"{g.name}" delayed by {g.delayDays} days</span>
            </div>
          ))}
        </div>
      )}

      {decision.impact.debtRisk && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <Shield className="h-3 w-3 text-warning flex-shrink-0" />
          <span>{decision.impact.debtRisk}</span>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary mt-2"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Show less' : 'Show details'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {decision.projectedBalances.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Projected Balances</p>
              <div className="space-y-1">
                {decision.projectedBalances.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.date}</span>
                    <span className={p.after >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatCurrency(p.after)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decision.alternatives.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Alternatives</p>
              <ul className="space-y-1">
                {decision.alternatives.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decision.nextBestActions.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Next Steps</p>
              <ul className="space-y-1">
                {decision.nextBestActions.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
