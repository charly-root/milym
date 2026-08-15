import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createTagTexture } from "../../utils/textures.js";

const HOME = [1.5, STAGE.center[1] + 0.55, STAGE.aiZ];
const RADIUS = 0.85;

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
 * s'allument un à un pendant que le backend interroge le modèle. Un fil relie
 * le réseau à la base de données, pour qu'on voie d'où viennent ses réponses.
 */
export function AINetwork({ quality }) {
  const group = useRef();
  const spinner = useRef();
  const nodes = useRef();
  const lit = useRef();
  const label = useRef();
  const { camera } = useThree();
  const tag = useMemo(() => createTagTexture("IA", "Modèle"), []);

  const { points, links, segments, wire } = useMemo(() => {
    const list = fibonacciSphere(quality.aiNodes, RADIUS);
    // Le seuil suit la densité : sur un profil léger, moins de nœuds veut dire
    // des voisins plus éloignés, et un seuil fixe ne relierait plus rien.
    const reach = 2 * RADIUS * Math.sqrt(Math.PI / quality.aiNodes) * 1.45;
    const pairs = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].distanceTo(list[j]) < reach) pairs.push(list[i], list[j]);
      }
    }
    // Le fil qui redescend vers la base de données.
    const target = new THREE.Vector3(
      STAGE.center[0] - HOME[0],
      STAGE.center[1] - 0.12 - HOME[1],
      STAGE.databaseZ - HOME[2]
    );
    return {
      points: list,
      links: new THREE.BufferGeometry().setFromPoints(pairs),
      segments: pairs.length / 2,
      wire: new THREE.BufferGeometry().setFromPoints([
        target.clone().normalize().multiplyScalar(RADIUS),
        target
      ])
    };
  }, [quality.aiNodes]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    points.forEach((point, i) => {
      dummy.position.copy(point);
      dummy.updateMatrix();
      nodes.current.setMatrixAt(i, dummy.matrix);
    });
    nodes.current.instanceMatrix.needsUpdate = true;
  }, [points]);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.745, 0.79);
    const collapse = between(p, 0.82, 0.875);
    setGroupOpacity(group.current, appear * (1 - collapse));
    if (!group.current.visible) return;

    group.current.position.set(
      lerp(HOME[0], STAGE.center[0], collapse),
      lerp(HOME[1], STAGE.center[1], collapse),
      lerp(HOME[2], 0, collapse)
    );
    group.current.scale.setScalar(1 - collapse);
    spinner.current.rotation.y += delta * 0.1;
    faceCamera(label.current, camera);

    // Les connexions s'allument progressivement pendant l'acte IA.
    const activation = between(p, 0.762, 0.812);
    lit.current.geometry.setDrawRange(0, Math.round(segments * activation) * 2);
  });

  return (
    <group ref={group} position={HOME}>
      <group ref={spinner}>
        <instancedMesh ref={nodes} args={[undefined, undefined, points.length]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#ede9fe" transparent opacity={0.95} />
        </instancedMesh>
        <lineSegments geometry={links}>
          <lineBasicMaterial color="#7c3aed" transparent opacity={0.28} />
        </lineSegments>
        <lineSegments ref={lit} geometry={links}>
          <lineBasicMaterial color="#ddd6fe" transparent opacity={0.75} />
        </lineSegments>
      </group>

      <lineSegments geometry={wire}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.3} />
      </lineSegments>

      <mesh ref={label} position={[0, 1.12, 0]}>
        <planeGeometry args={[0.56, 0.14]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
