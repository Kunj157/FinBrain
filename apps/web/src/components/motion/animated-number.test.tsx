import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { prefersReducedMotion } from '@/test/motion';
import { AnimatedNumber } from './animated-number';

const money = (n: number) => `$${n.toFixed(2)}`;

describe('AnimatedNumber', () => {
  it('renders the value as plain text', () => {
    render(<AnimatedNumber value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('counts up to the value and settles on it exactly', async () => {
    prefersReducedMotion(false);
    const { container } = render(<AnimatedNumber value={1234.5} from={0} format={money} />);
    expect(container).toHaveTextContent('$0.00');
    await waitFor(() => expect(container).toHaveTextContent('$1234.50'), { timeout: 4000 });
  });

  it('shows the final value at once under reduced motion', () => {
    prefersReducedMotion(true);
    const { container, rerender } = render(<AnimatedNumber value={3} from={0} format={money} />);
    expect(container).toHaveTextContent('$3.00');
    rerender(<AnimatedNumber value={9} from={0} format={money} />);
    expect(container).toHaveTextContent('$9.00');
  });
});
