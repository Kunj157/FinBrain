import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesSection } from './rules-section';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mocked = {
  get: vi.mocked(api.get),
  post: vi.mocked(api.post),
};

const rule = (id: string, merchant: string) => ({
  id,
  userId: 'u',
  priority: 0,
  merchantPattern: merchant,
  descriptionPattern: null,
  amountMin: null,
  amountMax: null,
  accountId: null,
  categoryId: 'cat-1',
  isActive: true,
  category: { id: 'cat-1', name: 'Shopping', color: '#2563eb' },
  account: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

beforeEach(() => {
  vi.resetAllMocks();
  mocked.get.mockImplementation((async (url: string) => {
    if (url === '/rules') return { data: { data: [rule('a', 'amazon'), rule('b', 'netflix')] } };
    if (url === '/categories') return { data: { data: [{ id: 'cat-1', name: 'Shopping', color: '#2563eb' }] } };
    return { data: { data: [] } };
  }) as never);
});

describe('RulesSection', () => {
  it('lists rules in precedence order and moves one down with the server order', async () => {
    mocked.post.mockResolvedValue({ data: { data: [rule('b', 'netflix'), rule('a', 'amazon')] } } as never);
    render(<RulesSection />);

    await screen.findByText('merchant: amazon');
    fireEvent.click(screen.getAllByRole('button', { name: 'Move rule down' })[0]);

    await waitFor(() => expect(mocked.post).toHaveBeenCalledWith('/rules/reorder', { ids: ['b', 'a'] }));
    await waitFor(() => expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('merchant: netflix'));
  });

  it('shows a dry-run count before applying rules, and applies only on confirm', async () => {
    mocked.post.mockImplementation((async (_url: string, body: { dryRun: boolean }) => ({
      data: {
        data: {
          dryRun: body.dryRun,
          scanned: 5,
          changed: 2,
          byRule: [{ ruleId: 'a', categoryName: 'Shopping', count: 2 }],
        },
      },
    })) as never);
    render(<RulesSection />);

    fireEvent.click(await screen.findByRole('button', { name: /Apply to transactions/ }));
    await screen.findByText(/2 transactions will change category/);
    expect(mocked.post).toHaveBeenLastCalledWith('/rules/apply', { dryRun: true });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText('Updated 2 transactions.');
    expect(mocked.post).toHaveBeenLastCalledWith('/rules/apply', { dryRun: false });
  });
});
