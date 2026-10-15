import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './stage';
import type { SceneProps } from './scene';
import type { MixSegment } from './spending-mix-model';

const OUTER = 1.9;
const INNER = 1.15;
const GAP = 0.035;

/** An annular sector, extruded upward in proportion to its share. */
function sectorGeometry(start: number, end: number, depth: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, OUTER, start, end, false);
  shape.absarc(0, 0, INNER, end, start, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 48,
  });
}

function Slice({
  segment,
  start,
  end,
  index,
  hovered,
  onHover,
}: {
  segment: MixSegment;
  start: number;
  end: number;
  index: number;
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const depth = 0.2 + segment.share * 1.0;
  const geometry = useMemo(() => sectorGeometry(start + GAP / 2, end - GAP / 2, depth), [start, end, depth]);
  const mid = (start + end) / 2;
  const grow = useRef(0);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    // Slices rise in one after another, then the hovered one lifts out.
    const ready = state.clock.elapsedTime > 0.2 + index * 0.08 ? 1 : 0;
    grow.current = THREE.MathUtils.damp(grow.current, ready, 4, delta);
    mesh.current.scale.z = Math.max(grow.current, 0.001);
    const lift = hovered ? 0.16 : 0;
    mesh.current.position.x = THREE.MathUtils.damp(mesh.current.position.x, Math.cos(mid) * lift, 8, delta);
    mesh.current.position.y = THREE.MathUtils.damp(mesh.current.position.y, Math.sin(mid) * lift, 8, delta);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(segment.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <meshPhysicalMaterial
        color={segment.color}
        emissive={segment.color}
        emissiveIntensity={hovered ? 0.35 : 0.08}
        metalness={0.25}
        roughness={0.3}
        clearcoat={1}
        clearcoatRoughness={0.12}
        envMapIntensity={1.1}
      />
    </mesh>
  );
}

function Ring({ segments, hovered, onHover }: { segments: MixSegment[]; hovered: string | null; onHover: (id: string | null) => void }) {
  const spin = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const arcs = useMemo(() => {
    let angle = Math.PI / 2;
    return segments.map((segment) => {
      const sweep = segment.share * Math.PI * 2;
      const arc = { segment, start: angle - sweep, end: angle };
      angle -= sweep;
      return arc;
    });
  }, [segments]);

  useFrame((state, delta) => {
    // A slow orbit that pauses while a slice is being inspected.
    if (spin.current && !hovered) spin.current.rotation.z += delta * 0.12;
    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, -1.0 - state.pointer.y * 0.15, 0.05);
      tilt.current.rotation.y = THREE.MathUtils.lerp(tilt.current.rotation.y, state.pointer.x * 0.2, 0.05);
    }
  });

  return (
    <group ref={tilt} rotation={[-1.0, 0, 0]}>
      <group ref={spin}>
        {arcs.map((arc, i) => (
          <Slice
            key={arc.segment.id}
            segment={arc.segment}
            start={arc.start}
            end={arc.end}
            index={i}
            hovered={hovered === arc.segment.id}
            onHover={onHover}
          />
        ))}
      </group>
    </group>
  );
}

/**
 * Spending by category as an extruded glass ring: each slice's angle is its
 * share and its height echoes it; the ring orbits slowly and a hovered slice
 * lifts out and stops the orbit.
 */
export default function SpendingMixScene({
  active,
  segments,
  hovered,
  onHover,
}: SceneProps & { segments: MixSegment[]; hovered: string | null; onHover: (id: string | null) => void }) {
  return (
    <Stage active={active} camera={{ position: [0, 0.6, 6.4], fov: 34 }} className="!absolute inset-0">
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.6]} />
      <directionalLight position={[3, 6, 5]} intensity={2.1} />
      <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#8f80ff" />
      <group position={[0, 0.15, 0]}>
        <Ring segments={segments} hovered={hovered} onHover={onHover} />
      </group>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.35} scale={8} blur={2.6} far={3} frames={1} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#8f80ff" position={[-4, 0, 3]} scale={3} />
        <Lightformer form="rect" intensity={0.8} position={[4, -2, 4]} scale={[6, 6, 1]} />
      </Environment>
    </Stage>
  );
}
