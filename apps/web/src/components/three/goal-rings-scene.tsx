import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './stage';
import type { SceneProps } from './scene';
import type { RingSpec } from './goal-rings-model';

const TUBE = 0.085;

/** One goal: a frosted full-circle track and a glossy arc that sweeps to its progress. */
function Ring({ spec, index }: { spec: RingSpec; index: number }) {
  const arc = useRef<THREE.Mesh>(null);
  const cap = useRef<THREE.Mesh>(null);
  const shown = useRef(0);
  const built = useRef(-1);

  useFrame((state, delta) => {
    const delay = 0.25 + index * 0.15;
    if (state.clock.elapsedTime < delay || !arc.current) return;
    shown.current = THREE.MathUtils.damp(shown.current, spec.progress, 2.6, delta);
    const p = shown.current;
    // Rebuild the arc only while it is still sweeping noticeably.
    if (Math.abs(p - built.current) > 0.002) {
      built.current = p;
      arc.current.geometry.dispose();
      arc.current.geometry = new THREE.TorusGeometry(
        spec.radius,
        TUBE,
        20,
        Math.max(4, Math.ceil(160 * p)),
        Math.max(p, 0.0001) * Math.PI * 2,
      );
    }
    if (cap.current) {
      const angle = p * Math.PI * 2;
      cap.current.position.set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0);
      cap.current.visible = p > 0.01;
    }
  });

  // Mirrored then turned so each arc starts at twelve o'clock and runs clockwise.
  return (
    <group rotation={[0, 0, -Math.PI / 2]} scale={[-1, 1, 1]}>
      <mesh>
        <torusGeometry args={[spec.radius, TUBE * 0.7, 16, 160]} />
        <meshPhysicalMaterial color={spec.color} transparent opacity={0.14} roughness={0.5} depthWrite={false} />
      </mesh>
      <mesh ref={arc}>
        <torusGeometry args={[spec.radius, TUBE, 20, 4, 0.0001]} />
        <meshPhysicalMaterial
          color={spec.color}
          emissive={spec.color}
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh ref={cap}>
        <sphereGeometry args={[TUBE * 1.35, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive={spec.color} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function Rings({ rings }: { rings: RingSpec[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.pointer.x * 0.45, 0.06);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.pointer.y * 0.35 - 0.12, 0.06);
  });
  return (
    <group ref={group}>
      {rings.map((spec, i) => (
        <Ring key={spec.id} spec={spec} index={i} />
      ))}
    </group>
  );
}

/** Goals as nested glossy rings that sweep to each goal's progress and lean toward the cursor. */
export default function GoalRingsScene({ active, rings }: SceneProps & { rings: RingSpec[] }) {
  return (
    <Stage active={active} camera={{ position: [0, 0, 6.2], fov: 35 }} className="!absolute inset-0">
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.7]} />
      <directionalLight position={[3, 5, 6]} intensity={2} />
      <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.35}>
        <Rings rings={rings} />
      </Float>
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#8f80ff" position={[-4, 0, 3]} scale={3} />
        <Lightformer form="rect" intensity={0.8} position={[4, -2, 4]} scale={[6, 6, 1]} />
      </Environment>
    </Stage>
  );
}
