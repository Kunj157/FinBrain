import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Send, Loader2, MessageCircle, History, Sparkles, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Lightbulb, Target, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
  recommended: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  reasonable: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  caution: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  not_recommended: 'text-red-400 bg-red-500/10 border-red-500/20',
  insufficient_data: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (convId: string) => {
    try {
      const res = await api.get(`/advisor/conversations/${convId}`);
      const conv = res.data.data;
      setActiveConvId(convId);
      const loadedMessages: ChatMessage[] = [];
      for (const m of conv.messages) {
        loadedMessages.push({
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
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);

    try {
      const res = await api.post('/advisor/chat', {
        message: msg,
        conversationId: activeConvId,
      });

      const { reply, conversationId, structuredData } = res.data.data;

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: reply,
        structuredData,
      }]);

      if (!activeConvId && conversationId) {
        setActiveConvId(conversationId);
        const convsRes = await api.get('/advisor/conversations');
        setConversations(convsRes.data.data);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'AI service not configured. Set GROQ_API_KEY in apps/api/.env to enable the advisor.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = async (messageIdx: number, feedback: 'thumbs_up' | 'thumbs_down') => {
    try {
      await api.post(`/advisor/messages/${messageIdx}/feedback`, { feedback });
    } catch {
      // silent
    }
  };

  const confidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      low: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <Badge variant="outline" className={`${colors[confidence] || colors.low} text-xs`}>
        {confidence} confidence
      </Badge>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {showHistory && (
        <div className="w-64 flex-shrink-0 overflow-y-auto glass-strong rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Conversations</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                  activeConvId === c.id
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'hover:bg-white/5 text-muted-foreground'
                }`}
              >
                <p className="truncate">{c.title || 'New conversation'}</p>
                <p className="text-xs opacity-50 mt-0.5">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Brain className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Advisor</h1>
              <p className="text-xs text-muted-foreground">Personalized financial guidance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && confidenceBadge(profile.confidence)}
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {profile && (
            <div className="w-72 flex-shrink-0 overflow-y-auto space-y-3">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Financial Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Income</span>
                    <span className="font-medium">{formatCurrency(profile.monthlyIncomeAvg)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Expenses</span>
                    <span className="font-medium">{formatCurrency(profile.monthlyExpenseAvg)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Savings Rate</span>
                    <span className={`font-medium ${profile.savingsRateAvg >= 20 ? 'text-emerald-400' : profile.savingsRateAvg >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {profile.savingsRateAvg.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Emergency Fund</span>
                    <span className={`font-medium ${profile.emergencyFundMonths >= 3 ? 'text-emerald-400' : profile.emergencyFundMonths >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {profile.emergencyFundMonths} months
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Level</span>
                    <span className="font-medium capitalize">{profile.riskLevel}</span>
                  </div>
                </CardContent>
              </Card>

              {profile.advisorSummary && (
                <Card className="glass">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{profile.advisorSummary}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    Suggested Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="w-full text-left p-2 rounded-lg text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 glass-strong rounded-xl">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <Brain className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">Ask your financial advisor</h2>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    I can help you make financial decisions based on your actual income, expenses, goals, and spending patterns.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {suggestedQuestions.slice(0, 4).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="p-3 rounded-xl text-sm text-left glass hover:bg-white/5 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'glass'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Advisor</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                    {msg.structuredData?.type === 'affordability' && typeof msg.structuredData.decision === 'object' && msg.structuredData.decision !== null && (
                      <AffordabilityCard decision={msg.structuredData.decision as unknown as AffordabilityDecision} />
                    )}

                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleFeedback(idx, 'thumbs_up')}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleFeedback(idx, 'thumbs_down')}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!chatInput.trim() || isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AffordabilityCard({ decision }: { decision: AffordabilityDecision }) {
  const [expanded, setExpanded] = useState(false);
  const DecisionIcon = decisionIcons[decision.decision] || AlertTriangle;

  return (
    <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DecisionIcon className="h-4 w-4" />
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
              <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-400 flex-shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {decision.impact.goalDelays.length > 0 && (
        <div className="space-y-1 mb-2">
          {decision.impact.goalDelays.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Target className="h-3 w-3 text-blue-400 flex-shrink-0" />
              <span>"{g.name}" delayed by {g.delayDays} days</span>
            </div>
          ))}
        </div>
      )}

      {decision.impact.debtRisk && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <Shield className="h-3 w-3 text-orange-400 flex-shrink-0" />
          <span>{decision.impact.debtRisk}</span>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
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
                    <span className={p.after >= 0 ? 'text-emerald-400' : 'text-red-400'}>
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
                    <span className="text-emerald-400">•</span> {a}
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
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-400 flex-shrink-0" /> {a}
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
