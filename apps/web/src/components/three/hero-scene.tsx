import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Float, Instance, Instances, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './stage';
import { tokenColor } from './colors';
import type { SceneProps } from './scene';

/** Coins per stack, left to right: a growth curve built from money. */
const STACKS = [3, 5, 7, 10, 14];
const COIN_H = 0.11;
const SPACING = 1.12;

function CoinStacks() {
  const group = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const coins = useMemo(
    () =>
      STACKS.flatMap((count, s) =>
        Array.from({ length: count }, (_, i) => ({
          key: `${s}-${i}`,
          stack: s,
          x: (s - (STACKS.length - 1) / 2) * SPACING,
          y: i * COIN_H,
          // A slight, stable wobble so stacks read as real coins.
          twist: Math.sin(s * 7.1 + i * 3.3) * 0.05,
          drift: Math.cos(s * 5.3 + i * 1.7) * 0.03,
        })),
      ),
    [],
  );
  const refs = useRef<(THREE.Object3D | null)[]>([]);

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    // Stacks rise in one after another, then settle.
    coins.forEach((coin, i) => {
      const obj = refs.current[i];
      if (!obj) return;
      const delay = coin.stack * 0.18 + (coin.y / COIN_H) * 0.03;
      const k = THREE.MathUtils.clamp((t - delay) / 0.7, 0, 1);
      const ease = 1 - Math.pow(1 - k, 3);
      obj.position.y = coin.y + (1 - ease) * 2.2;
      obj.scale.setScalar(0.001 + ease);
    });
    // Ease the whole group toward the pointer for a parallax tilt.
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.pointer.x * 0.3 - 0.15, 0.05);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.pointer.y * 0.12 + 0.12, 0.05);
    }
  });

  // Fixed hues, not theme tokens: the coins must stay vivid on light backgrounds too.
  const gold = '#2fc48e';
  return (
    <group ref={group} position={[0, -1.35, 0]}>
      <Instances limit={64} range={coins.length}>
        <cylinderGeometry args={[0.5, 0.5, COIN_H * 0.82, 64]} />
        <meshPhysicalMaterial
          color={gold}
          metalness={0.55}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.2}
          iridescence={0.3}
          iridescenceIOR={1.3}
          sheen={0.4}
          envMapIntensity={1.1}
        />
        {coins.map((coin, i) => (
          <Instance
            key={coin.key}
            ref={(el: THREE.Object3D | null) => {
              refs.current[i] = el;
            }}
            position={[coin.x + coin.drift, coin.y, coin.drift]}
            rotation={[0, coin.twist, coin.twist * 0.4]}
          />
        ))}
      </Instances>
      <GrowthCurve />
    </group>
  );
}

/** The growth curve over the stacks: a glowing tube with light flowing along it. */
function GrowthCurve() {
  const flow = useRef<THREE.Points>(null);
  const curve = useMemo(() => {
    const width = SPACING * (STACKS.length - 1);
    const pts = Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      return new THREE.Vector3((t - 0.5) * (width + 0.8), 0.95 + Math.pow(t, 2.2) * 1.9, 0.35);
    });
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const count = 36;
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const attr = flow.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const time = state.clock.elapsedTime * 0.12;
    for (let i = 0; i < count; i++) {
      curve.getPointAt((i / count + time) % 1, point);
      attr.setXYZ(i, point.x, point.y, point.z);
    }
    attr.needsUpdate = true;
  });

  const accent = '#8f80ff';
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 160, 0.022, 10, false]} />
        <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 160, 0.075, 10, false]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      <points ref={flow}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.11} color="#ffffff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/**
 * Landing hero: stacks of iridescent coins rise into a growth curve, with a
 * particle trail above them; the whole scene leans toward the cursor.
 */
export default function HeroScene({ active }: SceneProps) {
  return (
    <Stage active={active} camera={{ position: [0, 1.5, 9.2], fov: 34 }} className="!absolute inset-0">
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.6]} />
      <directionalLight position={[4, 7, 6]} intensity={2.2} />
      <directionalLight position={[-6, 2, -4]} intensity={0.8} color={tokenColor('accent', '#a59cff')} />
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
        <CoinStacks />
      </Float>
      <Sparkles count={60} scale={[10, 5, 4]} size={2.2} speed={0.35} opacity={0.6} color={tokenColor('primary')} />
      {/* Reflections from light panels rendered locally, so no HDR download. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, 2]} scale={[12, 4, 1]} />
        <Lightformer form="ring" intensity={1.4} color={tokenColor('accent', '#a59cff')} position={[-4, 1, 3]} scale={3} />
        <Lightformer form="rect" intensity={0.8} position={[4, 0, 4]} scale={[6, 6, 1]} />
      </Environment>
    </Stage>
  );
}
