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

/** Ce qui se trouve derrière l'interface : la passerelle, le serveur, les services. */
const MODULES = [
  { title: "API Gateway", sub: "Entrée", x: -0.78 },
  { title: "Node.js", sub: "Runtime", x: 0 },
  { title: "Auth", sub: "Services", x: 0.78 }
];

export function BackendModules({ quality }) {
  const group = useRef();
  const { camera } = useThree();
  const tags = useMemo(() => MODULES.map((m) => createTagTexture(m.title, m.sub)), []);
  // Sans arête, un boîtier sombre sur fond noir n'existe pas à l'écran.
  const outline = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.34, 0.42)), []);

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.595, 0.655);
    const collapse = between(p, 0.82, 0.875);
    setGroupOpacity(group.current, appear * (1 - collapse));
    if (!group.current.visible) return;

    // Les modules restent, mais cèdent la parole à la base de données.
    const named = 1 - between(p, 0.695, 0.735);

    group.current.position.z = lerp(STAGE.backendZ, 0, collapse);
    group.current.scale.setScalar(1 - collapse);

    group.current.children.forEach((module, i) => {
      if (module.userData.index == null) return;
      module.position.y = Math.sin(clock.elapsedTime * 0.4 + i) * 0.018;

      const tag = module.children[2];
      tag.material.opacity *= named;
      tag.visible = tag.material.opacity > 0.004;
      if (tag.visible) faceCamera(tag, camera);
    });
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1], STAGE.backendZ]}>
      {MODULES.map((module, i) => (
        <group key={module.title} userData={{ index: i }} position={[module.x, 0, 0]}>
          <mesh castShadow={quality.shadows}>
            <boxGeometry args={[0.62, 0.34, 0.42]} />
            <meshPhysicalMaterial
              color="#0d0d15"
              roughness={0.2}
              metalness={0.5}
              transparent
              opacity={0.92}
              transmission={quality.transmission ? 0.12 : 0}
              emissive="#4c1d95"
              emissiveIntensity={0.3}
            />
          </mesh>
          <lineSegments geometry={outline}>
            <lineBasicMaterial color="#a78bfa" transparent opacity={0.7} />
          </lineSegments>
          <mesh position={[0, 0.36, 0.05]}>
            <planeGeometry args={[0.62, 0.155]} />
            <meshBasicMaterial map={tags[i]} transparent depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
