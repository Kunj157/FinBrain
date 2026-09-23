import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { roundMoney } from '../services/finance-math';
import { buildAdvisorProfile, getAdvisorProfile } from '../services/advisor/profile-engine';
import { getSpendingPatterns } from '../services/advisor/pattern-engine';
import { buildAdvisorContext, contextToString } from '../services/advisor/context-builder';
import {
  storeMemory,
  upsertMemory,
  getMemories,
  getMemoriesForPrompt,
  deleteMemory,
  clearAllMemories,
} from '../services/advisor/memory-service';
import { isAffordabilityQuestion } from '../services/advisor/purchase-parser';
import { runAffordabilityCheck, handleAffordabilityFromChat } from '../services/advisor/affordability-engine';
import { createScenario, getUserScenarios, getScenario, deleteScenario } from '../services/advisor/scenario-engine';
import { generateInsights, storeInsights, getStoredInsights, dismissInsight } from '../services/advisor/insight-engine';
import { generateWeeklyRecap } from '../services/advisor/weekly-recap-engine';
import { detectAnomalies } from '../services/advisor/anomaly-engine';
import {
  chatCompletion,
  streamChatCompletion,
  isLlmConfigured,
  LlmError,
  type ChatMessage,
} from '../services/llm';

const router = Router();

// How many past messages of a conversation are replayed to the model. Enough
// for the thread to stay coherent without letting an old conversation grow
// the prompt (and its cost) without bound.
const HISTORY_TURNS = 20;

// Tells the model how much the data behind its answer is actually worth, so
// the certainty of the wording tracks the certainty of the inputs.
const CONFIDENCE_GUIDANCE: Record<string, string> = {
  high:
    'DATA CONFIDENCE: HIGH. The figures below rest on a substantial, well-categorised history. ' +
    'You may answer directly and quantitatively.',
  medium:
    'DATA CONFIDENCE: MEDIUM. The figures below rest on a limited history, so averages may not ' +
    'represent a typical month. State your answer, but note where a short history could change it, ' +
    'and prefer ranges over single precise predictions.',
  low:
    'DATA CONFIDENCE: LOW. There is very little data behind the figures below and they may be badly ' +
    'unrepresentative. Do not present conclusions as certain. Lead with what is missing, give any ' +
    'numbers as rough indications explicitly derived from the sparse data you were given, and tell ' +
    'the user what to import or connect to get a trustworthy answer.',
};

const ADVISOR_SYSTEM_PROMPT = `You are FinBrain Advisor, a personal financial advisor AI. You have access to the user's complete financial data and your job is to help them make informed financial decisions.

IMPORTANT RULES:
- You provide educational financial guidance, not regulated financial advice.
- You may be wrong and the user should verify important decisions.
- You do not recommend buying securities without proper risk context.
- Never ask for bank passwords, SSNs, card numbers, or full account numbers.
- Every numeric answer should reference its source (transactions, accounts, budgets, goals, or holdings).

Your role:
- Answer questions about their financial situation with specific numbers
- Provide prescriptive advice ("what should I do") not just descriptive ("what happened")
- Consider impact on goals, savings rate, emergency fund, and cash flow
- Give concrete recommendations with alternatives
- Be honest about trade-offs

Response format:
- Lead with a direct answer (yes/no/it depends)
- Provide financial reasoning with specific numbers from their data
- Show impact analysis (effect on goals, savings, runway)
- Suggest alternatives if applicable
- Keep responses concise but thorough`;

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await getAdvisorProfile(req.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Advisor profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to build advisor profile' });
  }
});

router.post('/profile/recompute', async (req: Request, res: Response) => {
  try {
    const profile = await buildAdvisorProfile(req.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('Advisor profile recompute error:', err);
    res.status(500).json({ success: false, error: 'Failed to recompute profile' });
  }
});

router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const patterns = await getSpendingPatterns(req.userId);
    res.json({ success: true, data: patterns });
  } catch (err) {
    console.error('Advisor patterns error:', err);
    res.status(500).json({ success: false, error: 'Failed to get spending patterns' });
  }
});

router.get('/memory', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const memories = await getMemories(req.userId, type);
    res.json({ success: true, data: memories });
  } catch (err) {
    console.error('Advisor memory error:', err);
    res.status(500).json({ success: false, error: 'Failed to get memories' });
  }
});

router.post('/memory', async (req: Request, res: Response) => {
  const schema = z.object({
    memoryType: z.string(),
    title: z.string(),
    content: z.string(),
    source: z.string().default('user'),
    confidence: z.number().min(0).max(1).default(0.5),
    importance: z.number().min(1).max(10).default(5),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  try {
    await storeMemory(req.userId, parsed.data);
    res.json({ success: true, message: 'Memory stored' });
  } catch (err) {
    console.error('Advisor memory store error:', err);
    res.status(500).json({ success: false, error: 'Failed to store memory' });
  }
});

router.delete('/memory/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteMemory(req.userId, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Memory not found' });
    res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    console.error('Advisor memory delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete memory' });
  }
});

router.post('/affordability', async (req: Request, res: Response) => {
  const schema = z.object({
    itemName: z.string().min(1),
    amount: z.number().positive().optional(),
    currency: z.string().default('USD'),
    purchaseDate: z.string().optional(),
    paymentMethod: z.enum(['cash', 'credit', 'financing']).default('cash'),
    financingMonths: z.number().optional(),
    financingApr: z.number().optional(),
    priority: z.enum(['need', 'want', 'investment', 'emergency']).default('want'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  try {
    const purchase = {
      itemName: parsed.data.itemName,
      amount: parsed.data.amount || null,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod as 'cash' | 'credit' | 'financing',
      financingMonths: parsed.data.financingMonths || null,
      financingApr: parsed.data.financingApr || null,
      priority: parsed.data.priority as 'need' | 'want' | 'investment' | 'emergency',
      confidence: 0.8,
    };

    const decision = await runAffordabilityCheck(req.userId, purchase);
    res.json({ success: true, data: decision });
  } catch (err) {
    console.error('Affordability check error:', err);
    res.status(500).json({ success: false, error: 'Failed to run affordability check' });
  }
});

router.post('/scenarios', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    scenarioType: z.enum([
      'income_change', 'expense_change', 'purchase', 'career_break', 'new_job',
      'home_purchase', 'rent_increase', 'retirement', 'custom',
    ]),
    input: z.record(z.unknown()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  try {
    const result = await createScenario(req.userId, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Scenario creation error:', err);
    res.status(500).json({ success: false, error: 'Failed to create scenario' });
  }
});

router.post('/scenarios/compare', async (req: Request, res: Response) => {
  const schema = z.object({ ids: z.array(z.string()).min(2).max(4) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Provide 2-4 scenario IDs' });
  }

  try {
    const scenarios = await prisma.scenario.findMany({
      where: { id: { in: parsed.data.ids }, userId: req.userId },
    });
    if (scenarios.length < 2) {
      return res.status(404).json({ success: false, error: 'Not enough scenarios found' });
    }
    res.json({ success: true, data: scenarios });
  } catch (err) {
    console.error('Scenario compare error:', err);
    res.status(500).json({ success: false, error: 'Failed to compare scenarios' });
  }
});

router.get('/net-worth-projection', async (req: Request, res: Response) => {
  try {
    const months = Math.min(parseInt(req.query.months as string) || 12, 60);
    const profile = await prisma.advisorProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.json({ success: true, data: { projections: [] } });

    const accounts = await prisma.account.findMany({ where: { userId: req.userId } });
    const totalAssets = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
    const totalDebts = accounts.reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0);
    const currentNetWorth = totalAssets - totalDebts;

    const monthlyNet = profile.monthlyIncomeAvg - profile.monthlyExpenseAvg;
    const projections: Array<{ month: string; netWorth: number }> = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      projections.push({
        month: d.toISOString().slice(0, 7),
        netWorth: roundMoney(currentNetWorth + monthlyNet * i),
      });
    }

    res.json({
      success: true,
      data: {
        currentNetWorth: roundMoney(currentNetWorth),
        monthlyNetFlow: roundMoney(monthlyNet),
        projections,
      },
    });
  } catch (err) {
    console.error('Net worth projection error:', err);
    res.status(500).json({ success: false, error: 'Failed to compute projection' });
  }
});

router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const scenarios = await getUserScenarios(req.userId);
    res.json({ success: true, data: scenarios });
  } catch (err) {
    console.error('Scenarios list error:', err);
    res.status(500).json({ success: false, error: 'Failed to list scenarios' });
  }
});

router.get('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    const scenario = await getScenario(req.userId, req.params.id);
    if (!scenario) return res.status(404).json({ success: false, error: 'Scenario not found' });
    res.json({ success: true, data: scenario });
  } catch (err) {
    console.error('Scenario get error:', err);
    res.status(500).json({ success: false, error: 'Failed to get scenario' });
  }
});

router.delete('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    await deleteScenario(req.userId, req.params.id);
    res.json({ success: true, message: 'Scenario deleted' });
  } catch (err) {
    console.error('Scenario delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete scenario' });
  }
});

router.get('/insights', async (req: Request, res: Response) => {
  try {
    const insights = await getStoredInsights(req.userId);
    res.json({ success: true, data: insights });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ success: false, error: 'Failed to get insights' });
  }
});

router.post('/insights/generate', async (req: Request, res: Response) => {
  try {
    const insights = await generateInsights(req.userId);
    await storeInsights(req.userId, insights);
    res.json({ success: true, data: insights });
  } catch (err) {
    console.error('Insights generation error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

router.post('/insights/:id/dismiss', async (req: Request, res: Response) => {
  try {
    await dismissInsight(req.userId, req.params.id);
    res.json({ success: true, message: 'Insight dismissed' });
  } catch (err) {
    console.error('Insight dismiss error:', err);
    res.status(500).json({ success: false, error: 'Failed to dismiss insight' });
  }
});

router.get('/weekly-recap', async (req: Request, res: Response) => {
  try {
    const recap = await generateWeeklyRecap(req.userId);
    res.json({ success: true, data: recap });
  } catch (err) {
    console.error('Weekly recap error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate weekly recap' });
  }
});

router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const anomalies = await detectAnomalies(req.userId);
    res.json({ success: true, data: anomalies });
  } catch (err) {
    console.error('Anomalies error:', err);
    res.status(500).json({ success: false, error: 'Failed to detect anomalies' });
  }
});

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const conversations = await prisma.advisorConversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ success: false, error: 'Failed to get conversations' });
  }
});

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await prisma.advisorConversation.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error('Conversation get error:', err);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  // The client sends null for the first message of a new conversation.
  // `.optional()` alone accepts undefined but rejects null, which made
  // every new conversation fail with a 400 before it ever reached the model.
  conversationId: z.string().nullish(),
});

interface PreparedTurn {
  convId: string;
  prompt: ChatMessage[];
  structuredData: Record<string, unknown> | null;
  /** How much data the answer rests on, surfaced alongside the reply. */
  confidence: string;
}

/**
 * Opens (or continues) a conversation, records the user's turn, and assembles
 * the prompt. Shared by the buffered and streaming chat endpoints so the two
 * cannot drift apart in what the model actually sees.
 */
async function prepareChatTurn(
  userId: string,
  message: string,
  conversationId?: string | null,
): Promise<PreparedTurn> {
  let convId = conversationId ?? null;

  if (!convId) {
    const conv = await prisma.advisorConversation.create({
      data: { userId, title: message.slice(0, 100), mode: 'advisor' },
    });
    convId = conv.id;
  }

  await prisma.advisorMessage.create({
    data: { conversationId: convId, role: 'user', content: message },
  });

  let toolResponse: string | null = null;
  let structuredData: Record<string, unknown> | null = null;

  if (isAffordabilityQuestion(message)) {
    const { decision, parsed: purchase } = await handleAffordabilityFromChat(userId, message);
    structuredData = { type: 'affordability', decision, purchase };
    toolResponse = JSON.stringify(decision, null, 2);
  }

  const [context, memories] = await Promise.all([
    buildAdvisorContext(userId),
    getMemoriesForPrompt(userId),
  ]);
  const contextStr = contextToString(context);
  const confidence = context.profile?.confidence ?? 'low';

  const prompt: ChatMessage[] = [
    { role: 'system', content: ADVISOR_SYSTEM_PROMPT },
    // How much an answer is worth is a property of the data behind it. The
    // prompt used to be identical for six transactions and six thousand, so a
    // low-confidence profile still produced categorical advice with specific
    // figures — the most dangerous combination in a financial context.
    { role: 'system', content: CONFIDENCE_GUIDANCE[confidence] ?? CONFIDENCE_GUIDANCE.low },
    { role: 'user', content: `Here is the user's financial context:\n\n${contextStr}` },
  ];

  if (memories) {
    prompt.push({
      role: 'system',
      content:
        `Things you have previously learned about this user, carried over from earlier conversations:\n\n${memories}\n\n` +
        'Treat these as background, not as fact about their current position — the figures in the financial context above are authoritative. Refer to them when relevant rather than asking the user to repeat themselves.',
    });
  }

  if (toolResponse) {
    prompt.push({
      role: 'system',
      content: `The affordability engine returned this structured result:\n\n${toolResponse}\n\nUse this data to provide a personalized, human-readable answer. Reference the specific numbers.`,
    });
  }

  // Take the NEWEST turns, then restore chronological order. Ordering
  // ascending with a take of 20 kept the *oldest* twenty messages, so once a
  // conversation passed twenty turns it froze on its opening exchange and
  // every later question was answered without its own context.
  //
  // The current message is already persisted above, so this includes it — it
  // must not be appended again or the model sees the question twice.
  const recentMessages = await prisma.advisorMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_TURNS,
  });

  for (const m of recentMessages.reverse()) {
    if (m.role === 'user' || m.role === 'assistant') {
      prompt.push({ role: m.role, content: m.content });
    }
  }

  return { convId, prompt, structuredData, confidence };
}

router.post('/chat', async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { message, conversationId } = parsed.data;

  if (!isLlmConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured. Set GROQ_API_KEY in apps/api/.env',
    });
  }

  try {
    const { convId, prompt, structuredData, confidence } = await prepareChatTurn(
      req.userId,
      message,
      conversationId,
    );

    const completion = await chatCompletion(prompt);
    const reply = completion.content;

    const assistantMessage = await prisma.advisorMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: reply,
        structuredData: structuredData as never,
      },
    });

    await prisma.advisorConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    // Auto-store memories from significant conversations
    try {
      const lowerMsg = message.toLowerCase();

      // Store affordability decisions
      if (structuredData?.type === 'affordability' && isAffordabilityQuestion(message)) {
        const affordabilityData = structuredData as { decision: { decision: string; summary: string }; purchase: { itemName: string; amount: number | null } };
        await upsertMemory(req.userId, {
          memoryType: 'financial_decision',
          title: `Purchase consideration: ${affordabilityData.purchase?.itemName || 'unknown'}`,
          content: `User asked about buying ${affordabilityData.purchase?.itemName || 'unknown'} for ${affordabilityData.purchase?.amount || 'unknown amount'}. Decision: ${affordabilityData.decision?.decision || 'unknown'}. ${affordabilityData.decision?.summary || ''}`,
          source: 'advisor_chat',
          confidence: 0.7,
          importance: 6,
        });
      }

      // Store user preferences detected from questions
      if (lowerMsg.includes('save') || lowerMsg.includes('saving')) {
        await upsertMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User interested in savings',
          content: `User asked about savings: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('invest') || lowerMsg.includes('portfolio') || lowerMsg.includes('stock')) {
        await upsertMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User interested in investments',
          content: `User asked about investments: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('budget') || lowerMsg.includes('spending')) {
        await upsertMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User focused on budgeting',
          content: `User asked about budgeting/spending: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('goal') || lowerMsg.includes('vacation') || lowerMsg.includes('emergency fund')) {
        await upsertMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User focused on goals',
          content: `User asked about goals: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      // Store significant financial facts mentioned
      if (lowerMsg.includes('rent') || lowerMsg.includes('mortgage')) {
        await upsertMemory(req.userId, {
          memoryType: 'financial_fact',
          title: 'Housing cost discussion',
          content: `User mentioned housing costs: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.6,
          importance: 5,
        });
      }

      if (lowerMsg.includes('salary') || lowerMsg.includes('income') || lowerMsg.includes('raise')) {
        await upsertMemory(req.userId, {
          memoryType: 'financial_fact',
          title: 'Income discussion',
          content: `User mentioned income: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.6,
          importance: 5,
        });
      }
    } catch {
      // Memory storage is best-effort, don't fail the chat
    }

    res.json({
      success: true,
      data: {
        reply,
        conversationId: convId,
        // The client needs the real id to attach feedback. It previously
        // posted the message's index in a local array, which matched nothing.
        messageId: assistantMessage.id,
        confidence,
        structuredData,
      },
    });
  } catch (err) {
    console.error('Advisor chat error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate response' });
  }
});

/**
 * Server-sent events variant of /chat.
 *
 * Answers run to several hundred tokens and the model reasons before emitting
 * anything, so a buffered response left the user watching a spinner for the
 * whole generation with no sign of progress.
 *
 * Frames: `delta` per content chunk, then exactly one terminal `done` or
 * `error`. The assistant turn is persisted only once the stream completes, so
 * a half-generated answer never enters the conversation history.
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { message, conversationId } = parsed.data;

  if (!isLlmConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured. Set GROQ_API_KEY in apps/api/.env',
    });
  }

  // Headers must go out before the first token or the client cannot begin
  // reading. X-Accel-Buffering stops nginx holding the stream in a buffer.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Stop the upstream call as soon as the reader goes away, so an abandoned
  // tab does not keep burning tokens we will never deliver.
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  try {
    const { convId, prompt, structuredData, confidence } = await prepareChatTurn(
      req.userId,
      message,
      conversationId,
    );

    // The client needs this immediately: without it a brand-new conversation
    // would send its second message with a null id and start another thread.
    send('start', { conversationId: convId, structuredData, confidence });

    let reply = '';
    for await (const delta of streamChatCompletion(prompt, { signal: abort.signal })) {
      reply += delta;
      send('delta', { content: delta });
    }

    if (abort.signal.aborted) return;

    if (!reply.trim()) {
      throw new LlmError('Provider returned an empty completion', undefined, true);
    }

    const assistantMessage = await prisma.advisorMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: reply,
        structuredData: structuredData as never,
      },
    });

    await prisma.advisorConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    send('done', { messageId: assistantMessage.id, conversationId: convId, structuredData, confidence });
    res.end();
  } catch (err) {
    console.error('Advisor chat stream error:', err);

    if (abort.signal.aborted) return;

    // The status line is already committed, so the failure has to travel as a
    // stream event rather than an HTTP status.
    send('error', {
      error:
        err instanceof LlmError && err.retryable
          ? 'The advisor is temporarily unavailable. Please try again.'
          : 'Failed to generate a response.',
    });
    res.end();
  }
});

router.post('/messages/:id/feedback', async (req: Request, res: Response) => {
  const schema = z.object({
    feedback: z.enum(['thumbs_up', 'thumbs_down']),
    reason: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input' });
  }

  try {
    // Scope by the owning conversation. Without this any authenticated user
    // could set feedback on another user's advisor message by guessing its id.
    const { count } = await prisma.advisorMessage.updateMany({
      where: { id: req.params.id, conversation: { userId: req.userId } },
      data: { feedback: parsed.data.feedback },
    });

    if (count === 0) {
      // Same response whether the message is absent or someone else's, so the
      // endpoint cannot be used to probe for valid ids.
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
});

router.delete('/memories', async (req: Request, res: Response) => {
  try {
    const count = await clearAllMemories(req.userId);
    res.json({ success: true, message: `Deleted ${count} memories` });
  } catch (err) {
    console.error('Clear memories error:', err);
    res.status(500).json({ success: false, error: 'Failed to clear memories' });
  }
});

export default router;
