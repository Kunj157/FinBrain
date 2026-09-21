import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { roundMoney } from '../services/finance-math';
import { buildAdvisorProfile, getAdvisorProfile } from '../services/advisor/profile-engine';
import { buildSpendingPatterns, getSpendingPatterns } from '../services/advisor/pattern-engine';
import { buildAdvisorContext, contextToString } from '../services/advisor/context-builder';
import { storeMemory, getMemories, deleteMemory, clearAllMemories } from '../services/advisor/memory-service';
import { parsePurchaseMessage, isAffordabilityQuestion } from '../services/advisor/purchase-parser';
import { runAffordabilityCheck, handleAffordabilityFromChat } from '../services/advisor/affordability-engine';
import { createScenario, getUserScenarios, getScenario, deleteScenario } from '../services/advisor/scenario-engine';
import { generateInsights, storeInsights, getStoredInsights, dismissInsight } from '../services/advisor/insight-engine';
import { generateWeeklyRecap } from '../services/advisor/weekly-recap-engine';
import { detectAnomalies } from '../services/advisor/anomaly-engine';

const router = Router();

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

router.post('/chat', async (req: Request, res: Response) => {
  const schema = z.object({
    message: z.string().min(1).max(2000),
    conversationId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.format() });
  }

  const { message, conversationId } = parsed.data;

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured. Set GROQ_API_KEY in apps/api/.env',
    });
  }

  try {
    let convId = conversationId;

    if (!convId) {
      const conv = await prisma.advisorConversation.create({
        data: {
          userId: req.userId,
          title: message.slice(0, 100),
          mode: 'advisor',
        },
      });
      convId = conv.id;
    }

    await prisma.advisorMessage.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    let toolResponse: string | null = null;
    let structuredData: Record<string, unknown> | null = null;

    if (isAffordabilityQuestion(message)) {
      const { decision, parsed: purchase } = await handleAffordabilityFromChat(req.userId, message);
      structuredData = { type: 'affordability', decision, purchase };
      toolResponse = JSON.stringify(decision, null, 2);
    }

    const context = await buildAdvisorContext(req.userId);
    const contextStr = contextToString(context);

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: ADVISOR_SYSTEM_PROMPT },
      { role: 'user', content: `Here is the user's financial context:\n\n${contextStr}` },
    ];

    if (toolResponse) {
      messages.push({
        role: 'system',
        content: `The affordability engine returned this structured result:\n\n${toolResponse}\n\nUse this data to provide a personalized, human-readable answer. Reference the specific numbers.`,
      });
    }

    const recentMessages = await prisma.advisorMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const m of recentMessages) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content });
      }
    }

    messages.push({ role: 'user', content: message });

    let reply: string;
    if (groqKey) {
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
      });
      if (!response.ok) throw new Error(`LLM error: ${response.status}`);
      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      reply = data.choices[0]?.message?.content || 'No response generated.';
    } else {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
      });
      if (!response.ok) throw new Error(`LLM error: ${response.status}`);
      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      reply = data.choices[0]?.message?.content || 'No response generated.';
    }

    await prisma.advisorMessage.create({
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
      const lowerReply = reply.toLowerCase();

      // Store affordability decisions
      if (structuredData?.type === 'affordability' && isAffordabilityQuestion(message)) {
        const affordabilityData = structuredData as { decision: { decision: string; summary: string }; purchase: { itemName: string; amount: number | null } };
        await storeMemory(req.userId, {
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
        await storeMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User interested in savings',
          content: `User asked about savings: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('invest') || lowerMsg.includes('portfolio') || lowerMsg.includes('stock')) {
        await storeMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User interested in investments',
          content: `User asked about investments: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('budget') || lowerMsg.includes('spending')) {
        await storeMemory(req.userId, {
          memoryType: 'user_preference',
          title: 'User focused on budgeting',
          content: `User asked about budgeting/spending: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.5,
          importance: 4,
        });
      }

      if (lowerMsg.includes('goal') || lowerMsg.includes('vacation') || lowerMsg.includes('emergency fund')) {
        await storeMemory(req.userId, {
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
        await storeMemory(req.userId, {
          memoryType: 'financial_fact',
          title: 'Housing cost discussion',
          content: `User mentioned housing costs: "${message.slice(0, 200)}"`,
          source: 'advisor_chat',
          confidence: 0.6,
          importance: 5,
        });
      }

      if (lowerMsg.includes('salary') || lowerMsg.includes('income') || lowerMsg.includes('raise')) {
        await storeMemory(req.userId, {
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
        structuredData,
      },
    });
  } catch (err) {
    console.error('Advisor chat error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate response' });
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
    await prisma.advisorMessage.updateMany({
      where: { id: req.params.id },
      data: { feedback: parsed.data.feedback },
    });
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
