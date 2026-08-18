import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { faceCamera } from "../../utils/billboard.js";
import { createTagTexture } from "../../utils/textures.js";

/**
 * La vue éclatée. L'écran devient la couche « UI » et les autres couches
 * sortent de lui vers l'arrière : on regarde l'épaisseur d'une application.
 * Chaque plaque est bordée d'un liseré, sinon le verre sombre sur fond noir ne
 * se distingue pas et la pile paraît vide.
 */
const LAYERS = [
  { title: "UI", sub: "Interface", plate: false },
  { title: "React", sub: "Composants", plate: true },
  { title: "Logic", sub: "État", plate: true },
  { title: "API", sub: "Contrat", plate: true },
  { title: "Node.js", sub: "Serveur", plate: true },
  { title: "Database", sub: "Données", plate: true }
];

export function LayerStack({ quality }) {
  const group = useRef();
  const { camera } = useThree();
  const tags = useMemo(() => LAYERS.map((l) => createTagTexture(l.title, l.sub)), []);
  const outline = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(STAGE.screen.width, STAGE.screen.height)),
    []
  );

  useFrame(() => {
    const p = experienceStore.progress;
    const stack = group.current;
    if (!stack) return;

    const expand = between(p, 0.485, 0.575);
    const frontFade = between(p, 0.575, 0.62);
    const handoff = between(p, 0.61, 0.655);
    const named = 1 - between(p, 0.58, 0.63);

    const alive = expand * (1 - handoff);
    stack.visible = alive > 0.004;
    if (!stack.visible) return;

    stack.children.forEach((child) => {
      const index = child.userData.index;
      // En partant, chaque plaque recule : la pile s'enfonce dans le noir
      // vers la salle des machines au lieu de s'évaporer sur place.
      child.position.z = -index * STAGE.layerGap * expand - handoff * 0.9;
      child.scale.setScalar(1);

      const isFront = index <= 2;
      const opacity = alive * (isFront ? 1 - frontFade : 1);
      child.visible = opacity > 0.004;
      if (!child.visible) return;

      child.children.forEach((part) => {
        if (!part.material) return;
        const factor = part.userData.tag ? named : 1;
        part.material.opacity = part.userData.baseOpacity * opacity * factor;
        part.visible = part.material.opacity > 0.004;
        if (part.userData.tag && part.visible) faceCamera(part, camera);
      });
    });
  });

  return (
    <group ref={group} position={STAGE.center}>
      {LAYERS.map((layer, index) => (
        <group key={layer.title} userData={{ index }} position={[0, 0, -index * STAGE.layerGap]}>
          {layer.plate && (
            <>
              <mesh userData={{ baseOpacity: 0.42 }}>
                <planeGeometry args={[STAGE.screen.width, STAGE.screen.height]} />
                <meshPhysicalMaterial
                  color="#150e26"
                  roughness={0.16}
                  metalness={0.35}
                  transparent
                  opacity={0.42}
                  transmission={quality.transmission ? 0.25 : 0}
                  thickness={0.3}
                  emissive="#3b0764"
                  emissiveIntensity={0.18}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <lineSegments geometry={outline} userData={{ baseOpacity: 0.7 }}>
                <lineBasicMaterial color="#a78bfa" transparent opacity={0.7} />
              </lineSegments>
            </>
          )}
          {/* Les noms montent en escalier avec la profondeur : alignés, ils se
              chevauchaient en une seule ligne illisible. */}
          <mesh position={[1.2, 0.1 + index * 0.12, 0]} userData={{ baseOpacity: 1, tag: true }}>
            <planeGeometry args={[0.6, 0.15]} />
            <meshBasicMaterial map={tags[index]} transparent opacity={1} depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
