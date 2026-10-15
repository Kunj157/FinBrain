import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActiveHighlight } from './animated-background';
import { InView } from './in-view';
import { MotionProvider } from './motion-provider';
import { TextShimmer } from './text-shimmer';
import { TransitionPanel } from './transition-panel';

describe('motion content primitives', () => {
  it('renders text and panels as real content inside the provider', () => {
    render(
      <MotionProvider>
        <TextShimmer>Thinking</TextShimmer>
        <InView>Revealed</InView>
        <TransitionPanel activeKey="month">Month panel</TransitionPanel>
        <span className="relative">
          <ActiveHighlight layoutId="tab" />
          Selected
        </span>
      </MotionProvider>,
    );
    expect(screen.getByText('Thinking')).toHaveClass('text-shimmer');
    expect(screen.getByText('Revealed')).toBeInTheDocument();
    expect(screen.getByText('Month panel')).toBeInTheDocument();
    expect(screen.getByText('Selected').querySelector('[aria-hidden]')).toBeInTheDocument();
  });

  it('swaps the panel content when the key changes', () => {
    const { rerender } = render(
      <MotionProvider>
        <TransitionPanel activeKey="a">First</TransitionPanel>
      </MotionProvider>,
    );
    rerender(
      <MotionProvider>
        <TransitionPanel activeKey="b">Second</TransitionPanel>
      </MotionProvider>,
    );
    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
