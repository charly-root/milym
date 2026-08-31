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

const HOME = [0, STAGE.center[1] + 0.08, STAGE.aiZ];
const RADIUS = 0.95;

function fibonacciSphere(count, radius) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    points.push(
      new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius)
    );
  }
  return points;
}

/** Le modèle, seul au centre : les nœuds sont là, les liens s'allument un à un. */
export function AINetwork({ quality }) {
  const group = useRef();
  const spinner = useRef();
  const nodes = useRef();
  const lit = useRef();
  const label = useRef();
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tag = useMemo(() => createTagTexture("Étincelle", "Éveil"), []);

  const { points, links, segments } = useMemo(() => {
    const list = fibonacciSphere(quality.aiNodes, RADIUS);
    const reach = 2 * RADIUS * Math.sqrt(Math.PI / Math.max(8, quality.aiNodes)) * 1.45;
    const pairs = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].distanceTo(list[j]) < reach) pairs.push(list[i], list[j]);
      }
    }
    return {
      points: list,
      links: new THREE.BufferGeometry().setFromPoints(pairs),
      segments: pairs.length / 2
    };
  }, [quality.aiNodes]);

  useLayoutEffect(() => {
    if (!nodes.current) return;
    points.forEach((point, i) => {
      dummy.position.copy(point);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      nodes.current.setMatrixAt(i, dummy.matrix);
    });
    nodes.current.instanceMatrix.needsUpdate = true;
  }, [dummy, points]);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.755, 0.788);
    const implode = between(p, 0.808, 0.848);
    const opacity = appear * (1 - implode);
    setGroupOpacity(group.current, opacity);
    if (!group.current.visible) return;

    group.current.position.set(HOME[0], HOME[1], HOME[2]);
    group.current.scale.setScalar(lerp(0.72, 1, appear) * lerp(1, 0.08, implode));
    if (spinner.current) spinner.current.rotation.y += delta * 0.12 * (1 - implode);
    if (label.current) {
      faceCamera(label.current, camera);
      label.current.visible = implode < 0.35;
    }

    const activation = between(p, 0.762, 0.792);
    if (lit.current) lit.current.geometry.setDrawRange(0, Math.round(segments * activation) * 2);

    if (nodes.current) {
      points.forEach((point, i) => {
        dummy.position.copy(point).multiplyScalar(1 - implode * 0.92);
        dummy.scale.setScalar(Math.max(0.15, 1 - implode));
        dummy.updateMatrix();
        nodes.current.setMatrixAt(i, dummy.matrix);
      });
      nodes.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={HOME}>
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial
          color="#1a1230"
          emissive="#a78bfa"
          emissiveIntensity={1.1}
          roughness={0.3}
          metalness={0.3}
          transparent
          opacity={0.95}
        />
      </mesh>
      <group ref={spinner}>
        <instancedMesh ref={nodes} args={[undefined, undefined, points.length]}>
          <sphereGeometry args={[0.038, 8, 8]} />
          <meshBasicMaterial color="#f5f3ff" transparent opacity={0.95} />
        </instancedMesh>
        <lineSegments geometry={links}>
          <lineBasicMaterial color="#6d28d9" transparent opacity={0.22} />
        </lineSegments>
        <lineSegments ref={lit} geometry={links}>
          <lineBasicMaterial color="#ede9fe" transparent opacity={0.9} />
        </lineSegments>
      </group>
      <mesh ref={label} position={[0, 1.22, 0]}>
        <planeGeometry args={[0.56, 0.16]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
