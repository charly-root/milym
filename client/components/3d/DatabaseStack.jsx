import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createTagTexture } from "../../utils/textures.js";

const RINGS = 4;

/** La base de données : des anneaux de verre empilés, traversés de données. */
export function DatabaseStack({ quality }) {
  const group = useRef();
  const label = useRef();
  const dots = useRef();
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tag = useMemo(() => createTagTexture("Database", "Stockage"), []);
  const count = Math.max(10, Math.round(quality.particles / 2));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.685, 0.735);
    const collapse = between(p, 0.82, 0.875);
    // Pendant l'acte IA, la base s'efface aux trois quarts : vue de haut, la
    // pile d'anneaux émissifs ferait une tache violette au pied du réseau.
    const aiFocus = between(p, 0.755, 0.79) * (1 - between(p, 0.82, 0.86));
    setGroupOpacity(group.current, appear * (1 - collapse) * (1 - aiFocus * 0.75));
    if (!group.current.visible) return;

    group.current.position.z = lerp(STAGE.databaseZ, 0, collapse);
    group.current.position.y = lerp(STAGE.center[1] - 0.12, STAGE.center[1], collapse);
    group.current.scale.setScalar(1 - collapse);
    group.current.rotation.y += 0.0022;

    // La base cède la parole au réseau IA plutôt que de rester nommée.
    label.current.material.opacity *= 1 - between(p, 0.755, 0.785);
    label.current.visible = label.current.material.opacity > 0.004;
    if (label.current.visible) faceCamera(label.current, camera);

    if (!dots.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ring = i % RINGS;
      const angle = t * (0.3 + ring * 0.06) + i * 0.7;
      const radius = 0.5 + (ring % 2) * 0.09;
      dummy.position.set(Math.cos(angle) * radius, (ring - (RINGS - 1) / 2) * 0.26, Math.sin(angle) * radius);
      dummy.scale.setScalar(0.022);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1] - 0.12, STAGE.databaseZ]}>
      {/* Des disques pleins, pas des anneaux : vus de haut ou de biais, les
          anneaux plats se fondaient en une tache ; l'empilement de galettes
          reste l'icône « base de données » sous tous les angles. */}
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh key={i} position={[0, (i - (RINGS - 1) / 2) * 0.26, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.15, 40]} />
          <meshStandardMaterial
            color="#1d1236"
            roughness={0.24}
            metalness={0.4}
            transparent
            opacity={0.92}
            emissive="#7c3aed"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      <instancedMesh ref={dots} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#ddd6fe" transparent opacity={0.85} />
      </instancedMesh>

      <mesh ref={label} position={[0, 0.82, 0]}>
        <planeGeometry args={[0.72, 0.18]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
