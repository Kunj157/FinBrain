import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Instance, Instances, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './stage';
import type { SceneProps } from './scene';

const COUNT = 26;

/** Coins drifting slowly through space, tumbling, with a soft parallax. */
function DriftingCoins() {
  const group = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Object3D | null)[]>([]);
  const coins = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 91.7 + n * 13.1) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x: (r(1) - 0.5) * 11,
          y: (r(2) - 0.5) * 8,
          z: -r(3) * 6,
          spin: 0.2 + r(4) * 0.5,
          bob: r(5) * Math.PI * 2,
          scale: 0.5 + r(6) * 0.7,
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    coins.forEach((c, i) => {
      const obj = refs.current[i];
      if (!obj) return;
      obj.position.y = c.y + Math.sin(t * 0.4 + c.bob) * 0.35;
      obj.rotation.x = t * c.spin + c.bob;
      obj.rotation.z = t * c.spin * 0.6;
    });
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.pointer.x * 0.12, 0.03);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.pointer.y * 0.08, 0.03);
    }
  });

  return (
    <group ref={group}>
      <Instances limit={COUNT}>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 48]} />
        <meshPhysicalMaterial color="#2fc48e" metalness={0.6} roughness={0.3} clearcoat={1} iridescence={0.3} envMapIntensity={1} />
        {coins.map((c, i) => (
          <Instance
            key={i}
            ref={(el: THREE.Object3D | null) => {
              refs.current[i] = el;
            }}
            position={[c.x, c.y, c.z]}
            scale={c.scale}
          />
        ))}
      </Instances>
    </group>
  );
}

/** Quiet background for the sign-in and sign-up screens. */
export default function AuthScene({ active }: SceneProps) {
  return (
    <Stage active={active} camera={{ position: [0, 0, 8], fov: 40 }} className="!absolute inset-0">
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.6]} />
      <directionalLight position={[3, 5, 6]} intensity={1.8} />
      <DriftingCoins />
      <Sparkles count={50} scale={[12, 8, 6]} size={2} speed={0.25} opacity={0.5} color="#8f80ff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 2]} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#8f80ff" position={[-4, 0, 3]} scale={3} />
      </Environment>
    </Stage>
  );
}
