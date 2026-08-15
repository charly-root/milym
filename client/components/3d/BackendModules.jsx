import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { createTagTexture } from "../../utils/textures.js";

/** Ce qui se trouve derrière l'interface : la passerelle, le serveur, les services. */
const MODULES = [
  { title: "API Gateway", sub: "Entrée", x: -0.78 },
  { title: "Node.js", sub: "Runtime", x: 0 },
  { title: "Auth", sub: "Services", x: 0.78 }
];

export function BackendModules({ quality }) {
  const group = useRef();
  const tags = useMemo(() => MODULES.map((m) => createTagTexture(m.title, m.sub)), []);

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

      const tag = module.children[1];
      tag.material.opacity *= named;
      tag.visible = tag.material.opacity > 0.004;
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
              emissive="#2e1064"
              emissiveIntensity={0.16}
            />
          </mesh>
          <mesh position={[0, 0.32, 0.05]}>
            <planeGeometry args={[0.58, 0.145]} />
            <meshBasicMaterial map={tags[i]} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
