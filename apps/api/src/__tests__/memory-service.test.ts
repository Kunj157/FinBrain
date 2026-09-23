import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../prisma';
import {
  storeMemory,
  upsertMemory,
  getMemories,
  getMemoriesForPrompt,
} from '../services/advisor/memory-service';

// Its own user, created and torn down here, so the suite never touches the
// dev user's data or another test's rows.
const TEST_USER_ID = 'test-memory-service-user';

const baseEntry = {
  memoryType: 'user_preference',
  title: 'User focused on budgeting',
  content: 'first mention',
  source: 'advisor_chat',
  confidence: 0.5,
  importance: 4,
};

describe('advisor memory service', () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'memory-service@test.local',
        clerkId: 'test-memory-service-clerk',
        name: 'Memory Service Test',
      },
    });
  });

  afterAll(async () => {
    // Memories cascade with the user.
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.advisorMemory.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  describe('upsertMemory', () => {
    // The chat extractor derives memories from keyword matches with fixed
    // titles, so plain creates appended a near-identical row on every matching
    // turn. Once memories reached the prompt, those duplicates crowded out
    // genuine ones.
    it('keeps one row when the same title is stored repeatedly', async () => {
      await upsertMemory(TEST_USER_ID, baseEntry);
      await upsertMemory(TEST_USER_ID, { ...baseEntry, content: 'second mention' });
      await upsertMemory(TEST_USER_ID, { ...baseEntry, content: 'third mention' });

      const memories = await getMemories(TEST_USER_ID);
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('third mention');
    });

    it('keeps distinct titles apart', async () => {
      await upsertMemory(TEST_USER_ID, baseEntry);
      await upsertMemory(TEST_USER_ID, { ...baseEntry, title: 'User focused on goals' });

      expect(await getMemories(TEST_USER_ID)).toHaveLength(2);
    });

    it('does not lower an importance raised elsewhere', async () => {
      await upsertMemory(TEST_USER_ID, { ...baseEntry, importance: 9 });
      await upsertMemory(TEST_USER_ID, { ...baseEntry, importance: 2 });

      const [memory] = await getMemories(TEST_USER_ID);
      expect(memory.importance).toBe(9);
    });
  });

  describe('getMemories', () => {
    it('returns a memory whose expiry is still in the future', async () => {
      // Matching on `validUntil: null` alone hid these from creation until
      // they expired — invisible for their entire valid life.
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storeMemory(TEST_USER_ID, { ...baseEntry, validUntil: tomorrow });

      expect(await getMemories(TEST_USER_ID)).toHaveLength(1);
    });

    it('omits a memory that has already expired', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await storeMemory(TEST_USER_ID, { ...baseEntry, validUntil: yesterday });

      expect(await getMemories(TEST_USER_ID)).toHaveLength(0);
    });

    it('filters by memory type', async () => {
      await upsertMemory(TEST_USER_ID, baseEntry);
      await upsertMemory(TEST_USER_ID, {
        ...baseEntry,
        memoryType: 'financial_decision',
        title: 'Purchase consideration: laptop',
      });

      const decisions = await getMemories(TEST_USER_ID, 'financial_decision');
      expect(decisions).toHaveLength(1);
      expect(decisions[0].title).toBe('Purchase consideration: laptop');
    });
  });

  describe('getMemoriesForPrompt', () => {
    it('returns null when there is nothing to recall', async () => {
      expect(await getMemoriesForPrompt(TEST_USER_ID)).toBeNull();
    });

    it('renders the most important memories first and respects the limit', async () => {
      await upsertMemory(TEST_USER_ID, { ...baseEntry, title: 'low', importance: 1 });
      await upsertMemory(TEST_USER_ID, { ...baseEntry, title: 'high', importance: 10 });

      const rendered = await getMemoriesForPrompt(TEST_USER_ID, 1);
      expect(rendered).toContain('high');
      expect(rendered).not.toContain('low');
    });

    it('truncates long content so one memory cannot dominate the prompt', async () => {
      await upsertMemory(TEST_USER_ID, { ...baseEntry, content: 'x'.repeat(1000) });

      const rendered = await getMemoriesForPrompt(TEST_USER_ID);
      expect(rendered).toContain('…');
      expect(rendered!.length).toBeLessThan(400);
    });
  });
});
