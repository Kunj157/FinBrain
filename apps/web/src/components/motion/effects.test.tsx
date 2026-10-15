import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { prefersReducedMotion } from '@/test/motion';
import { BorderTrail } from './border-trail';
import { GlowEffect } from './glow-effect';
import { ProgressiveBlur } from './progressive-blur';
import { Spotlight } from './spotlight';
import { TiltCard } from './tilt-card';

describe('motion effects', () => {
  it('shows the border trail only when motion is allowed', () => {
    prefersReducedMotion(false);
    const { unmount } = render(<BorderTrail />);
    expect(screen.getByTestId('border-trail')).toHaveAttribute('aria-hidden', 'true');
    unmount();

    prefersReducedMotion(true);
    render(<BorderTrail />);
    expect(screen.queryByTestId('border-trail')).not.toBeInTheDocument();
  });

  it('lights the spotlight for a mouse but not under reduced motion', () => {
    prefersReducedMotion(false);
    const { unmount } = render(<Spotlight>Panel</Spotlight>);
    fireEvent.pointerMove(screen.getByText('Panel'), { pointerType: 'mouse', clientX: 10, clientY: 10 });
    expect(screen.getByTestId('spotlight')).toBeInTheDocument();
    unmount();

    prefersReducedMotion(true);
    render(<Spotlight>Quiet</Spotlight>);
    fireEvent.pointerMove(screen.getByText('Quiet'), { pointerType: 'mouse', clientX: 10, clientY: 10 });
    expect(screen.queryByTestId('spotlight')).not.toBeInTheDocument();
  });

  it('tilts only when motion is allowed and always renders its content', () => {
    prefersReducedMotion(false);
    const { unmount } = render(<TiltCard>Balance</TiltCard>);
    expect(screen.getByTestId('tilt-card')).toHaveTextContent('Balance');
    unmount();

    prefersReducedMotion(true);
    render(<TiltCard>Flat</TiltCard>);
    expect(screen.getByText('Flat')).toBeInTheDocument();
    expect(screen.queryByTestId('tilt-card')).not.toBeInTheDocument();
  });

  it('keeps decorative layers away from assistive technology', () => {
    const glow = render(<GlowEffect tone="negative" breathing />);
    expect(glow.container.firstChild).toHaveAttribute('aria-hidden', 'true');
    const blur = render(<ProgressiveBlur side="top" />);
    expect(blur.container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
