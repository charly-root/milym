import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { createTagTexture } from "../../utils/textures.js";

function fibonacciSphere(count, radius) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push(
      new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius)
    );
  }
  return points;
}

/**
 * Un réseau géométrique, pas un cerveau : des nœuds et des liens qui
 * s'allument un à un quand le backend interroge le modèle.
 */
export function AINetwork({ quality }) {
  const group = useRef();
  const lit = useRef();
  const tag = useMemo(() => createTagTexture("IA", "Modèle"), []);

  const { nodes, dim, bright, segments } = useMemo(() => {
    const points = fibonacciSphere(quality.aiNodes, 0.85);
    const pairs = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 0.62) pairs.push(points[i], points[j]);
      }
    }
    return {
      nodes: new THREE.BufferGeometry().setFromPoints(points),
      dim: new THREE.BufferGeometry().setFromPoints(pairs),
      bright: new THREE.BufferGeometry().setFromPoints(pairs),
      segments: pairs.length / 2
    };
  }, [quality.aiNodes]);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.745, 0.79);
    const collapse = between(p, 0.82, 0.875);
    setGroupOpacity(group.current, appear * (1 - collapse));
    if (!group.current.visible) return;

    group.current.position.set(
      lerp(-0.85, STAGE.center[0], collapse),
      lerp(STAGE.center[1] + 0.62, STAGE.center[1], collapse),
      lerp(STAGE.aiZ, 0, collapse)
    );
    group.current.scale.setScalar(1 - collapse);
    group.current.rotation.y += delta * 0.1;

    // Les connexions s'allument progressivement pendant l'acte IA.
    const activation = between(p, 0.765, 0.815);
    if (lit.current) {
      lit.current.geometry.setDrawRange(0, Math.round(segments * activation) * 2);
    }
  });

  return (
    <group ref={group} position={[-0.85, STAGE.center[1] + 0.62, STAGE.aiZ]}>
      <points geometry={nodes}>
        <pointsMaterial color="#ddd6fe" size={0.042} sizeAttenuation transparent opacity={0.9} />
      </points>
      <lineSegments geometry={dim}>
        <lineBasicMaterial color="#7c3aed" transparent opacity={0.16} />
      </lineSegments>
      <lineSegments ref={lit} geometry={bright}>
        <lineBasicMaterial color="#ddd6fe" transparent opacity={0.55} />
      </lineSegments>
      <mesh position={[0, 1.1, 0]}>
        <planeGeometry args={[0.56, 0.14]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
