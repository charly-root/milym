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

/** Trois services en ligne, face caméra — le backend se lit d'un coup d'œil. */
const MODULES = [
  { title: "API Gateway", sub: "Entrée", x: -1.05 },
  { title: "Node.js", sub: "Runtime", x: 0 },
  { title: "Auth", sub: "Services", x: 1.05 }
];

export function BackendModules({ quality }) {
  const group = useRef();
  const bus = useRef();
  const { camera } = useThree();
  const tags = useMemo(() => MODULES.map((m) => createTagTexture(m.title, m.sub)), []);
  const outline = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.72, 0.38, 0.46)), []);
  const busGeom = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(MODULES[0].x + 0.36, 0, 0),
        new THREE.Vector3(MODULES[1].x - 0.36, 0, 0),
        new THREE.Vector3(MODULES[1].x + 0.36, 0, 0),
        new THREE.Vector3(MODULES[2].x - 0.36, 0, 0)
      ]),
    []
  );

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.615, 0.655);
    const hold = 1 - between(p, 0.685, 0.72);
    const collapse = between(p, 0.82, 0.875);
    const opacity = appear * hold * (1 - collapse);
    setGroupOpacity(group.current, opacity);
    if (!group.current.visible) return;

    group.current.position.z = lerp(STAGE.backendZ, 0, collapse);
    group.current.scale.setScalar(1 - collapse * 0.35);

    const t = clock.elapsedTime;
    group.current.children.forEach((module) => {
      const i = module.userData.index;
      if (i == null) return;
      module.position.x = MODULES[i].x;
      module.position.y = Math.sin(t * 0.7 + i * 1.1) * 0.025;
      module.position.z = 0;
      const tag = module.children[2];
      if (tag) faceCamera(tag, camera);
    });

    if (bus.current?.material) {
      bus.current.material.opacity = (0.35 + Math.sin(t * 3.2) * 0.12) * opacity;
    }
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1], STAGE.backendZ]}>
      {MODULES.map((module, i) => (
        <group key={module.title} userData={{ index: i }} position={[module.x, 0, 0]}>
          <mesh castShadow={quality.shadows}>
            <boxGeometry args={[0.72, 0.38, 0.46]} />
            <meshPhysicalMaterial
              color="#12101c"
              roughness={0.22}
              metalness={0.45}
              transparent
              opacity={0.96}
              transmission={quality.transmission ? 0.08 : 0}
              emissive="#5b21b6"
              emissiveIntensity={0.45}
            />
          </mesh>
          <lineSegments geometry={outline}>
            <lineBasicMaterial color="#c4b5fd" transparent opacity={0.85} />
          </lineSegments>
          <mesh position={[0, 0.4, 0.05]}>
            <planeGeometry args={[0.78, 0.18]} />
            <meshBasicMaterial map={tags[i]} transparent depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
      <lineSegments ref={bus} geometry={busGeom}>
        <lineBasicMaterial color="#ddd6fe" transparent opacity={0.45} />
      </lineSegments>
    </group>
  );
}
