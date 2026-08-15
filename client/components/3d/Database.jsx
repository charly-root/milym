import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity } from "../../utils/math.js";

export function DatabaseRings({ quality }) {
  const group = useRef();
  const dots = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = quality.particles;

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.64, 0.7, 0.78, 0.86);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y += 0.12 * 0.016;
    if (!dots.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ring = i % 5;
      const a = t * (0.35 + ring * 0.08) + i * 0.4;
      const r = 0.35 + ring * 0.08;
      dummy.position.set(Math.cos(a) * r, (ring - 2) * 0.16, Math.sin(a) * r);
      dummy.scale.setScalar(0.018);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={[0, 0.35, -0.3]}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, (i - 2) * 0.16, 0]}>
          <ringGeometry args={[0.32, 0.46, 48]} />
          <meshPhysicalMaterial
            color="#1e1030"
            roughness={0.15}
            metalness={0.4}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            emissive="#5b21b6"
            emissiveIntensity={0.1}
            transmission={quality.transmission ? 0.2 : 0}
          />
        </mesh>
      ))}
      <instancedMesh ref={dots} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ddd6fe" transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
}
