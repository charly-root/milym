import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { createTagTexture } from "../../utils/textures.js";

const RINGS = 5;

/** La base de données : des anneaux de verre empilés, traversés de données. */
export function DatabaseStack({ quality }) {
  const group = useRef();
  const dots = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tag = useMemo(() => createTagTexture("Database", "Stockage"), []);
  const count = Math.max(10, Math.round(quality.particles / 2));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.685, 0.735);
    const collapse = between(p, 0.82, 0.875);
    setGroupOpacity(group.current, appear * (1 - collapse));
    if (!group.current.visible) return;

    group.current.position.z = lerp(STAGE.databaseZ, 0, collapse);
    group.current.position.y = lerp(STAGE.center[1] - 0.12, STAGE.center[1], collapse);
    group.current.scale.setScalar(1 - collapse);
    group.current.rotation.y += 0.0022;

    if (!dots.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ring = i % RINGS;
      const angle = t * (0.3 + ring * 0.06) + i * 0.7;
      const radius = 0.34 + (ring % 2) * 0.06;
      dummy.position.set(Math.cos(angle) * radius, (ring - (RINGS - 1) / 2) * 0.15, Math.sin(angle) * radius);
      dummy.scale.setScalar(0.016);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1] - 0.12, STAGE.databaseZ]}>
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, (i - (RINGS - 1) / 2) * 0.15, 0]}>
          <ringGeometry args={[0.28, 0.46, 40]} />
          <meshPhysicalMaterial
            color="#1c1030"
            roughness={0.14}
            metalness={0.42}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            emissive="#5b21b6"
            emissiveIntensity={0.14}
          />
        </mesh>
      ))}

      <instancedMesh ref={dots} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#ddd6fe" transparent opacity={0.85} />
      </instancedMesh>

      <mesh position={[0, 0.6, 0]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
