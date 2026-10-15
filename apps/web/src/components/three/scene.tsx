import { Component, lazy, Suspense, useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { hasWebGL } from './webgl';
import { useInViewport } from './use-in-viewport';

/** Props every lazily loaded scene receives. */
export interface SceneProps {
  /** False while the scene is off screen; scenes stop their render loop. */
  active: boolean;
}

/** If a scene fails to load or WebGL breaks mid-session, show the poster. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A 3D scene that costs nothing until it is needed. three.js and the scene
 * load in their own chunk, only when WebGL is available and the person has
 * not asked for reduced motion; otherwise, and while loading, a static poster
 * renders in its place. The scene is told when it leaves the viewport so its
 * render loop can stop.
 */
export function Scene3D<P extends object>({
  load,
  poster,
  className,
  props,
}: {
  load: () => Promise<{ default: ComponentType<P & SceneProps> }>;
  poster: ReactNode;
  className?: string;
  props?: P;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const active = useInViewport(ref);
  // `load` is stable per call site in practice; memoising on it keeps one lazy component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Scene = useMemo(() => lazy(load), []);
  const enabled = !reduced && hasWebGL();

  return (
    <div ref={ref} className={cn('relative', className)}>
      {enabled ? (
        <SceneBoundary fallback={poster}>
          <Suspense fallback={poster}>
            <Scene {...(props as P)} active={active} />
          </Suspense>
        </SceneBoundary>
      ) : (
        poster
      )}
    </div>
  );
}
