import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { faceCamera } from "../../utils/billboard.js";
import { createCaptionTexture, createLayerPlateTexture } from "../../utils/textures.js";

/**
 * La vue éclatée. Chaque plaque a une couleur, un numéro et un rôle technique
 * générique — sans nom d'outil.
 */
const LAYERS = [
  { id: "ui", index: 1, title: "Frontend", sub: "Vue", accent: "#ddd6fe", emissive: "#6d28d9" },
  { id: "react", index: 2, title: "Interface", sub: "Composants", accent: "#67e8f9", emissive: "#0e7490" },
  { id: "logic", index: 3, title: "Logique", sub: "État", accent: "#c4b5fd", emissive: "#5b21b6" },
  { id: "api", index: 4, title: "Contrats", sub: "Échanges", accent: "#fcd34d", emissive: "#a16207" },
  { id: "node", index: 5, title: "Serveur", sub: "Traitement", accent: "#4ade80", emissive: "#166534" },
  { id: "database", index: 6, title: "Données", sub: "Persistance", accent: "#fb7185", emissive: "#9f1239" }
];

const SLAB_DEPTH = 0.055;

export function LayerStack({ quality }) {
  const group = useRef();
  const { camera } = useThree();
  const plates = useMemo(() => LAYERS.map((layer) => createLayerPlateTexture(layer)), []);
  const tags = useMemo(
    () => LAYERS.map((layer) => createCaptionTexture(layer.title, layer.sub, layer.accent)),
    []
  );
  const outline = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(STAGE.screen.width, STAGE.screen.height, SLAB_DEPTH)
      ),
    []
  );

  useFrame(() => {
    const p = experienceStore.progress;
    const stack = group.current;
    if (!stack) return;

    const expand = between(p, 0.48, 0.57);
    const hold = 1 - between(p, 0.595, 0.655);
    const alive = expand * hold;
    stack.visible = alive > 0.004;
    if (!stack.visible) return;

    const portrait = experienceStore.portrait;
    const mid = (LAYERS.length - 1) / 2;
    const slabScale = portrait ? 0.44 : 1;
    stack.rotation.y = portrait ? 0 : -0.38 * expand;
    stack.rotation.x = portrait ? 0.06 : 0.1 * expand;

    stack.children.forEach((child) => {
      const index = child.userData.index;
      const peel = between(p, 0.48 + index * 0.012, 0.568);

      if (portrait) {
        child.position.x = (index - mid) * 0.04 * peel;
        child.position.y = (mid - index) * STAGE.layerGapY * peel;
        child.position.z = -index * 0.1 * peel;
        child.scale.setScalar(slabScale);
      } else {
        child.position.x = index * 0.05 * peel;
        child.position.y = (mid - index) * 0.03 * peel;
        child.position.z = -index * STAGE.layerGap * peel;
        child.scale.setScalar(1);
      }

      const opacity = alive;
      child.visible = opacity > 0.004;
      if (!child.visible) return;

      child.children.forEach((part) => {
        if (!part.material) return;
        part.material.opacity = part.userData.baseOpacity * opacity;
        part.visible = part.material.opacity > 0.004;
        if (part.userData.tag && part.visible) {
          if (portrait) {
            part.position.set(0.62, 0, SLAB_DEPTH);
          } else {
            part.position.set(STAGE.screen.width * 0.56, 0.02 + (index - mid) * 0.03, SLAB_DEPTH);
          }
          faceCamera(part, camera);
        }
      });
    });
  });

  return (
    <group ref={group} position={STAGE.center}>
      {LAYERS.map((layer, index) => (
        <group key={layer.title} userData={{ index }} position={[0, 0, -index * STAGE.layerGap]}>
          {index > 0 && (
            <>
              <mesh userData={{ baseOpacity: 0.94 }} castShadow={quality.shadows}>
                <boxGeometry args={[STAGE.screen.width, STAGE.screen.height, SLAB_DEPTH]} />
                <meshPhysicalMaterial
                  color="#0c0814"
                  roughness={0.22}
                  metalness={0.28}
                  transparent
                  opacity={0.94}
                  transmission={quality.transmission ? 0.08 : 0}
                  thickness={0.18}
                  emissive={layer.emissive}
                  emissiveIntensity={0.42}
                />
              </mesh>
              <lineSegments geometry={outline} userData={{ baseOpacity: 0.95 }}>
                <lineBasicMaterial color={layer.accent} transparent opacity={0.95} />
              </lineSegments>
              <mesh position={[0, 0, SLAB_DEPTH * 0.52 + 0.001]} userData={{ baseOpacity: 1 }}>
                <planeGeometry args={[STAGE.screen.width * 0.97, STAGE.screen.height * 0.97]} />
                <meshBasicMaterial map={plates[index]} transparent opacity={1} toneMapped={false} />
              </mesh>
            </>
          )}
          <mesh userData={{ baseOpacity: 1, tag: true }}>
            <planeGeometry args={[1.08, 0.21]} />
            <meshBasicMaterial map={tags[index]} transparent opacity={1} depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
