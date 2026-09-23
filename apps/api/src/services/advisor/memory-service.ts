import { type Prisma } from '@prisma/client';
import { prisma } from '../../prisma';

export interface AdvisorMemoryEntry {
  memoryType: string;
  title: string;
  content: string;
  source: string;
  confidence: number;
  importance: number;
  validUntil?: Date;
  metadata?: Record<string, unknown>;
}

export async function storeMemory(userId: string, entry: AdvisorMemoryEntry): Promise<void> {
  await prisma.advisorMemory.create({
    data: {
      userId,
      memoryType: entry.memoryType,
      title: entry.title,
      content: entry.content,
      source: entry.source,
      confidence: entry.confidence,
      importance: entry.importance,
      validUntil: entry.validUntil,
      metadata: (entry.metadata || {}) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getMemories(
  userId: string,
  memoryType?: string,
  limit: number = 50,
): Promise<Array<{
  id: string;
  memoryType: string;
  title: string;
  content: string;
  source: string;
  confidence: number;
  importance: number;
  validFrom: Date;
  validUntil: Date | null;
  metadata: Record<string, unknown>;
}>> {
  const where = memoryType
    ? { userId, memoryType, validUntil: null }
    : { userId, validUntil: null };

  const memories = await prisma.advisorMemory.findMany({
    where,
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return memories as unknown as Array<{
    id: string;
    memoryType: string;
    title: string;
    content: string;
    source: string;
    confidence: number;
    importance: number;
    validFrom: Date;
    validUntil: Date | null;
    metadata: Record<string, unknown>;
  }>;
}

// What the model is shown. Memories are short, but an account that has been
// chatting for months accumulates them, and every one costs prompt budget on
// every turn — so only the most important reach the model.
const PROMPT_MEMORY_LIMIT = 12;
const PROMPT_MEMORY_CONTENT_CHARS = 240;

/**
 * Memories rendered for the chat prompt, or null when there are none.
 *
 * Memories were being written on every turn and read by nothing, so the
 * advisor had a store it never consulted: it could not recall a purchase the
 * user had discussed with it minutes earlier.
 */
export async function getMemoriesForPrompt(
  userId: string,
  limit: number = PROMPT_MEMORY_LIMIT,
): Promise<string | null> {
  const memories = await getMemories(userId, undefined, limit);
  if (memories.length === 0) return null;

  const lines = memories.map((m) => {
    const content = m.content.length > PROMPT_MEMORY_CONTENT_CHARS
      ? `${m.content.slice(0, PROMPT_MEMORY_CONTENT_CHARS)}…`
      : m.content;
    return `- [${m.memoryType}] ${m.title}: ${content}`;
  });

  return lines.join('\n');
}

export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const result = await prisma.advisorMemory.deleteMany({
    where: { id: memoryId, userId },
  });
  return result.count > 0;
}

export async function expireMemory(userId: string, memoryId: string): Promise<boolean> {
  const result = await prisma.advisorMemory.updateMany({
    where: { id: memoryId, userId },
    data: { validUntil: new Date() },
  });
  return result.count > 0;
}

export async function clearAllMemories(userId: string): Promise<number> {
  const result = await prisma.advisorMemory.deleteMany({ where: { userId } });
  return result.count;
}

export async function storeProfileMemory(userId: string, profileSummary: string): Promise<void> {
  const existing = await prisma.advisorMemory.findFirst({
    where: { userId, memoryType: 'profile_summary', validUntil: null },
  });

  if (existing) {
    await prisma.advisorMemory.update({
      where: { id: existing.id },
      data: { content: profileSummary, source: 'profile_engine' },
    });
  } else {
    await storeMemory(userId, {
      memoryType: 'profile_summary',
      title: 'Financial Profile Summary',
      content: profileSummary,
      source: 'profile_engine',
      confidence: 0.8,
      importance: 10,
    });
  }
}
