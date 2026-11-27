import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { prisma } from '../prisma';
import rulesRouter from '../routes/rules';
import transactionsRouter from '../routes/transactions';
import {
  applyRules,
  checkRuleReferences,
  previewRule,
  reorderRules,
} from '../services/categorization-rules';

// Two users in one database. Every assertion below checks that user A's
// rules, transactions, categories and accounts are invisible to user B, and
// the reverse, both at the service layer and through the HTTP routes.
const USER_A = 'test-rules-user-a';
const USER_B = 'test-rules-user-b';
const USERS = [USER_A, USER_B];

let catOther: string;
let catShopping: string;
let catSubs: string;
let catB: string;
let accountA: string;
let accountB: string;
let ruleAmazon: string;
let ruleB: string;

function appFor(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, { userId });
    next();
  });
  app.use('/rules', rulesRouter);
  app.use('/transactions', transactionsRouter);
  return app;
}

// A server per user, so each request arrives as that user.
const servers = new Map<string, Server>();
const originFor = new Map<string, string>();

async function call(userId: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${originFor.get(userId)}/rules${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

async function seedUser(id: string, name: string) {
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: `${id}@test.local`, clerkId: `clerk-${id}`, name },
  });
}

async function txn(userId: string, categoryId: string, overrides: Record<string, unknown>) {
  return prisma.transaction.create({
    data: {
      userId,
      categoryId,
      type: 'expense',
      amount: 10,
      description: 'test',
      date: new Date('2026-10-01T00:00:00Z'),
      ...overrides,
    },
  });
}

beforeAll(async () => {
  await Promise.all([seedUser(USER_A, 'Rules A'), seedUser(USER_B, 'Rules B')]);
  // The seed below is idempotent on re-run after an aborted test.
  await prisma.categorizationRule.deleteMany({ where: { userId: { in: USERS } } });
  await prisma.transaction.deleteMany({ where: { userId: { in: USERS } } });

  const cat = (userId: string, name: string) =>
    prisma.category.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
  catOther = (await cat(USER_A, 'Other')).id;
  catShopping = (await cat(USER_A, 'Rules Shopping')).id;
  catSubs = (await cat(USER_A, 'Rules Subscriptions')).id;
  catB = (await cat(USER_B, 'Rules B Category')).id;

  accountA = (await prisma.account.create({ data: { userId: USER_A, name: 'A checking', type: 'checking' } })).id;
  accountB = (await prisma.account.create({ data: { userId: USER_B, name: 'B checking', type: 'checking' } })).id;

  await txn(USER_A, catOther, { merchant: 'Amazon', description: 'order 1', amount: 42.5, accountId: accountA });
  await txn(USER_A, catOther, { merchant: null, description: 'NETFLIX.COM', amount: 15.99 });
  // Reviewed: the user has confirmed this category, so apply must leave it alone.
  await txn(USER_A, catOther, { merchant: 'Amazon', description: 'prime', amount: 99, reviewed: true });
  // Soft-deleted: must not count anywhere.
  await txn(USER_A, catOther, { merchant: 'Amazon', description: 'gone', amount: 5, deletedAt: new Date() });
  await txn(USER_B, catB, { merchant: 'Amazon', description: 'b order', amount: 42.5, accountId: accountB });

  const ruleA = await prisma.categorizationRule.create({
    data: { userId: USER_A, categoryId: catShopping, merchantPattern: 'amazon', priority: 1 },
  });
  ruleAmazon = ruleA.id;
  ruleB = (
    await prisma.categorizationRule.create({
      data: { userId: USER_B, categoryId: catB, merchantPattern: 'amazon', priority: 1 },
    })
  ).id;

  for (const userId of USERS) {
    const listening = appFor(userId).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    servers.set(userId, listening);
    originFor.set(userId, `http://127.0.0.1:${(listening.address() as AddressInfo).port}`);
  }
});

afterAll(async () => {
  for (const s of servers.values()) await new Promise((resolve) => s.close(resolve));
  // Rules and transactions first: category and account FKs restrict deletion.
  await prisma.categorizationRule.deleteMany({ where: { userId: { in: USERS } } });
  await prisma.transaction.deleteMany({ where: { userId: { in: USERS } } });
  await prisma.user.deleteMany({ where: { id: { in: USERS } } });
  await prisma.$disconnect();
});

describe('preview and apply, scoped to the owner', () => {
  it('preview counts only the caller live transactions', async () => {
    const preview = await previewRule(USER_A, { merchantPattern: 'amazon', descriptionPattern: null, amountMin: null, amountMax: null, accountId: null });
    expect(preview.matched).toBe(2);
    expect(preview.scanned).toBe(3);
    expect(preview.sample.every((row) => row.categoryName === 'Other')).toBe(true);
  });

  it('applies criteria as AND across set fields', async () => {
    const preview = await previewRule(USER_A, { merchantPattern: 'amazon', descriptionPattern: null, amountMin: 50, amountMax: null, accountId: null });
    expect(preview.matched).toBe(1);
  });

  it('dry-run reports the change and writes nothing', async () => {
    const result = await applyRules(USER_A, { dryRun: true });
    expect(result.changed).toBe(1);
    const row = await prisma.transaction.findFirst({ where: { userId: USER_A, description: 'order 1' } });
    expect(row?.categoryId).toBe(catOther);
  });

  it('apply moves only unreviewed matches, and leaves the other user alone', async () => {
    const result = await applyRules(USER_A, { dryRun: false });
    expect(result.changed).toBe(1);
    expect(result.byRule).toEqual([{ ruleId: ruleAmazon, categoryName: 'Rules Shopping', count: 1 }]);

    const moved = await prisma.transaction.findFirst({ where: { userId: USER_A, description: 'order 1' } });
    expect(moved?.categoryId).toBe(catShopping);
    const reviewed = await prisma.transaction.findFirst({ where: { userId: USER_A, description: 'prime' } });
    expect(reviewed?.categoryId).toBe(catOther);
    const other = await prisma.transaction.findFirst({ where: { userId: USER_B, description: 'b order' } });
    expect(other?.categoryId).toBe(catB);
  });

  it('a higher-priority rule wins when two rules match the same transaction', async () => {
    const high = await prisma.categorizationRule.create({
      data: { userId: USER_A, categoryId: catSubs, descriptionPattern: 'netflix', priority: 10 },
    });
    const low = await prisma.categorizationRule.create({
      data: { userId: USER_A, categoryId: catShopping, merchantPattern: 'netflix', priority: 1 },
    });
    await applyRules(USER_A, { dryRun: false });
    const row = await prisma.transaction.findFirst({ where: { userId: USER_A, description: 'NETFLIX.COM' } });
    expect(row?.categoryId).toBe(catSubs);
    await prisma.categorizationRule.deleteMany({ where: { id: { in: [high.id, low.id] } } });
  });
});

describe('ownership of referenced rows', () => {
  it('rejects another user category or account', async () => {
    expect(await checkRuleReferences(USER_B, { categoryId: catShopping })).toBe('Category not found');
    expect(await checkRuleReferences(USER_B, { accountId: accountA })).toBe('Account not found');
    expect(await checkRuleReferences(USER_A, { categoryId: catShopping, accountId: accountA })).toBeNull();
  });

  it('reorder rejects ids that are not the caller full rule set', async () => {
    expect((await reorderRules(USER_A, [ruleB])).ok).toBe(false);
    expect((await reorderRules(USER_A, [ruleAmazon, ruleAmazon])).ok).toBe(false);
    expect((await reorderRules(USER_A, [])).ok).toBe(false);
    expect(await prisma.categorizationRule.findUnique({ where: { id: ruleB } })).not.toBeNull();
  });
});

describe('HTTP routes', () => {
  it('lists only the caller rules', async () => {
    const res = await call(USER_B, 'GET', '/');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: string }) => r.id)).toEqual([ruleB]);
  });

  it('refuses to create a rule that points at another users category', async () => {
    const res = await call(USER_B, 'POST', '/', { categoryId: catShopping, merchantPattern: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Category not found');
  });

  it('refuses a rule with no criteria, and an inverted amount range', async () => {
    const empty = await call(USER_A, 'POST', '/', { categoryId: catShopping, merchantPattern: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toBe('Set at least one condition');
    const inverted = await call(USER_A, 'POST', '/', { categoryId: catShopping, amountMin: 50, amountMax: 10 });
    expect(inverted.status).toBe(400);
  });

  it('PUT validates the merged rule, so removing the last criterion fails', async () => {
    const res = await call(USER_A, 'PUT', `/${ruleAmazon}`, { merchantPattern: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Set at least one condition');
  });

  it('hides another users rule from GET, PUT and DELETE', async () => {
    expect((await call(USER_A, 'GET', `/${ruleB}`)).status).toBe(404);
    expect((await call(USER_A, 'PUT', `/${ruleB}`, { isActive: false })).status).toBe(404);
    expect((await call(USER_B, 'DELETE', `/${ruleAmazon}`)).status).toBe(404);
  });

  it('preview refuses another users account', async () => {
    const res = await call(USER_B, 'POST', '/preview', { accountId: accountA });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Account not found');
  });

  it('creates a rule that is saved and returned with numeric amounts', async () => {
    const res = await call(USER_A, 'POST', '/', { categoryId: catSubs, descriptionPattern: 'hulu', amountMin: 5.5 });
    expect(res.status).toBe(201);
    expect(res.body.data.amountMin).toBe(5.5);
    expect(res.body.data.amountMax).toBeNull();
    await call(USER_A, 'DELETE', `/${res.body.data.id}`);
  });

  it('bulk import with no category, as bank sync sends it, gets the rule category', async () => {
    const res = await fetch(`${originFor.get(USER_A)}/transactions/bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [{
          type: 'expense', amount: 20, currency: 'USD', description: 'Prime renewal',
          merchant: 'Amazon', categoryId: '', paymentMethod: 'other',
          date: '2026-10-05T00:00:00Z', status: 'cleared', isRecurring: false,
        }],
      }),
    });
    expect(res.status).toBe(201);
    const row = await prisma.transaction.findFirst({ where: { userId: USER_A, description: 'Prime renewal' } });
    expect(row?.categoryId).toBe(catShopping);
  });

  it('apply with dryRun through the route reports only the callers rows', async () => {
    const res = await call(USER_B, 'POST', '/apply', { dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.dryRun).toBe(true);
    expect(res.body.data.changed).toBe(0);
  });

  it('reorder through the route applies a complete order', async () => {
    const res = await call(USER_A, 'POST', '/reorder', { ids: [ruleAmazon] });
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: string }) => r.id)).toEqual([ruleAmazon]);
  });
});
