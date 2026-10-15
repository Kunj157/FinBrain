import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from '@/test/motion';
import { Scene3D } from './scene';

const poster = <p>Static poster</p>;

describe('Scene3D', () => {
  it('shows the poster and never loads three.js without WebGL', () => {
    prefersReducedMotion(false);
    const load = vi.fn(() => new Promise<never>(() => {}));
    render(<Scene3D load={load} poster={poster} />);
    expect(screen.getByText('Static poster')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('shows the poster under reduced motion', () => {
    prefersReducedMotion(true);
    const load = vi.fn(() => new Promise<never>(() => {}));
    render(<Scene3D load={load} poster={poster} />);
    expect(screen.getByText('Static poster')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
});
