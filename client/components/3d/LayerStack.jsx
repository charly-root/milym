import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { createTagTexture } from "../../utils/textures.js";

/**
 * La vue éclatée. L'écran devient la couche « UI » et les autres couches
 * sortent de lui vers l'arrière : on regarde l'épaisseur d'une application.
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
  const tags = useMemo(() => LAYERS.map((l) => createTagTexture(l.title, l.sub)), []);

  useFrame(() => {
    const p = experienceStore.progress;
    const stack = group.current;
    if (!stack) return;

    const expand = between(p, 0.485, 0.575);
    // Les couches de surface s'effacent quand on passe derrière l'interface.
    const frontFade = between(p, 0.6, 0.675);
    // Tout converge ensuite vers le noyau.
    const collapse = between(p, 0.82, 0.875);
    // Les noms des couches ne servent que pendant la vue éclatée : au-delà,
    // c'est le backend qui prend la parole et l'écran se surchargerait.
    const named = 1 - between(p, 0.595, 0.645);

    const alive = expand * (1 - collapse);
    stack.visible = alive > 0.004;
    if (!stack.visible) return;

    stack.children.forEach((child) => {
      const index = child.userData.index;
      if (index == null) return;

      const depth = -index * STAGE.layerGap * expand;
      child.position.z = lerp(depth, 0, collapse);
      child.scale.setScalar(1 - collapse);

      const isFront = index <= 2;
      const opacity = expand * (isFront ? 1 - frontFade : 1);
      child.visible = opacity > 0.004;
      if (!child.visible) return;

      child.children.forEach((part) => {
        if (!part.material) return;
        const factor = part.userData.tag ? named : 1;
        part.material.opacity = part.userData.baseOpacity * opacity * factor;
        part.visible = part.material.opacity > 0.004;
      });
    });

    const rails = stack.children.filter((c) => c.userData.rail);
    const length = STAGE.layerGap * (LAYERS.length - 1) * expand;
    rails.forEach((rail) => {
      rail.scale.z = Math.max(length, 0.001);
      rail.position.z = -length / 2;
      rail.material.opacity = 0.35 * expand * (1 - collapse);
    });
  });

  return (
    <group ref={group} position={STAGE.center}>
      {LAYERS.map((layer, index) => (
        <group key={layer.title} userData={{ index }} position={[0, 0, -index * STAGE.layerGap]}>
          {layer.plate && (
            <mesh userData={{ baseOpacity: 0.34 }} castShadow={quality.shadows}>
              <planeGeometry args={[STAGE.screen.width, STAGE.screen.height]} />
              <meshPhysicalMaterial
                color="#140d22"
                roughness={0.16}
                metalness={0.4}
                transparent
                opacity={0.34}
                transmission={quality.transmission ? 0.3 : 0}
                thickness={0.3}
                emissive="#3b0764"
                emissiveIntensity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <mesh position={[1.02, 0.32, 0]} userData={{ baseOpacity: 1, tag: true }}>
            <planeGeometry args={[0.62, 0.155]} />
            <meshBasicMaterial map={tags[index]} transparent opacity={1} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {[-0.9, 0.9].map((x) => (
        <mesh key={x} userData={{ rail: true }} position={[x, 0, 0]}>
          <boxGeometry args={[0.008, 0.008, 1]} />
          <meshBasicMaterial color="#c4b5fd" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}
