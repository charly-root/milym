import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createCaptionTexture } from "../../utils/textures.js";

/** Trois pièces distinctes, reliées — le backend se lit d'un coup. */
const MODULES = [
  { title: "Passerelle", sub: "Entrée", x: -1.12, accent: "#fcd34d", emissive: "#a16207" },
  { title: "Serveur", sub: "Traitement", x: 0, accent: "#4ade80", emissive: "#166534" },
  { title: "Sécurité", sub: "Accès", x: 1.12, accent: "#67e8f9", emissive: "#0e7490" }
];

const BOX = [0.86, 0.5, 0.56];
const PORTRAIT_Y = [0.86, 0, -0.86];

export function BackendModules({ quality }) {
  const group = useRef();
  const bus = useRef();
  const title = useRef();
  const { camera } = useThree();
  const tags = useMemo(
    () => MODULES.map((m) => createCaptionTexture(m.title, m.sub, m.accent)),
    []
  );
  const banner = useMemo(() => createCaptionTexture("Backend", "Coulisses", "#c4b5fd"), []);
  const outline = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...BOX)), []);
  const busGeom = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.605, 0.652);
    const hold = 1 - between(p, 0.688, 0.728);
    const collapse = between(p, 0.82, 0.875);
    const opacity = appear * hold * (1 - collapse);
    setGroupOpacity(group.current, opacity);
    if (!group.current.visible) return;

    const portrait = experienceStore.portrait;
    group.current.position.z = lerp(STAGE.backendZ, 0, collapse);
    group.current.position.y = STAGE.center[1];
    group.current.scale.setScalar(1 - collapse * 0.35);

    const t = clock.elapsedTime;
    group.current.children.forEach((module) => {
      const i = module.userData.index;
      if (i == null) return;
      if (portrait) {
        module.position.x = 0;
        module.position.y = PORTRAIT_Y[i] + Math.sin(t * 0.7 + i * 1.1) * 0.018;
        module.position.z = 0;
      } else {
        module.position.x = MODULES[i].x;
        module.position.y = Math.sin(t * 0.7 + i * 1.1) * 0.025;
        module.position.z = 0;
      }
      const tag = module.children[2];
      if (tag) {
        tag.position.set(0, portrait ? 0.42 : 0.46, 0.08);
        faceCamera(tag, camera);
      }
    });

    if (title.current) {
      title.current.position.set(0, portrait ? 1.32 : 0.86, 0.1);
      faceCamera(title.current, camera);
    }

    const points = portrait
      ? [
          0, PORTRAIT_Y[0] - 0.28, 0,
          0, PORTRAIT_Y[1] + 0.28, 0,
          0, PORTRAIT_Y[1] - 0.28, 0,
          0, PORTRAIT_Y[2] + 0.28, 0
        ]
      : [
          MODULES[0].x + BOX[0] / 2, 0, 0,
          MODULES[1].x - BOX[0] / 2, 0, 0,
          MODULES[1].x + BOX[0] / 2, 0, 0,
          MODULES[2].x - BOX[0] / 2, 0, 0
        ];
    busGeom.attributes.position.array.set(points);
    busGeom.attributes.position.needsUpdate = true;
    if (bus.current?.material) {
      bus.current.material.opacity = (0.55 + Math.sin(t * 3.2) * 0.18) * opacity;
    }
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1], STAGE.backendZ]}>
      {MODULES.map((module, i) => (
        <group key={module.title} userData={{ index: i }} position={[module.x, 0, 0]}>
          <mesh castShadow={quality.shadows}>
            <boxGeometry args={BOX} />
            <meshPhysicalMaterial
              color="#12101c"
              roughness={0.2}
              metalness={0.48}
              transparent
              opacity={0.97}
              transmission={quality.transmission ? 0.06 : 0}
              emissive={module.emissive}
              emissiveIntensity={0.62}
            />
          </mesh>
          <lineSegments geometry={outline}>
            <lineBasicMaterial color={module.accent} transparent opacity={0.95} />
          </lineSegments>
          <mesh position={[0, 0.46, 0.08]}>
            <planeGeometry args={[1.22, 0.24]} />
            <meshBasicMaterial map={tags[i]} transparent depthWrite={false} depthTest={false} />
          </mesh>
          <mesh position={[-0.32, 0.16, BOX[2] / 2 + 0.004]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color={module.accent} transparent opacity={0.95} />
          </mesh>
        </group>
      ))}
      <lineSegments ref={bus} geometry={busGeom}>
        <lineBasicMaterial color="#f5f3ff" transparent opacity={0.65} />
      </lineSegments>
      <mesh ref={title} position={[0, 0.86, 0.1]}>
        <planeGeometry args={[1.35, 0.28]} />
        <meshBasicMaterial map={banner} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
