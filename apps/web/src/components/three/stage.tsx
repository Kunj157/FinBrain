import { Canvas, type CanvasProps } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import type { ReactNode } from 'react';

/**
 * The shared WebGL canvas: transparent, pixel ratio capped at 1.5, and a
 * render loop that runs only while the scene is visible.
 */
export function Stage({
  active,
  children,
  camera = { position: [0, 0, 8], fov: 35 },
  ...rest
}: {
  active: boolean;
  children: ReactNode;
} & Omit<CanvasProps, 'children'>) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={camera}
      aria-hidden
      {...rest}
    >
      <AdaptiveDpr pixelated={false} />
      {children}
    </Canvas>
  );
}
