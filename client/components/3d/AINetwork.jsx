import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity } from "../../utils/math.js";

function fibonacciSphere(count, radius) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
  }
  return pts;
}

export function AINetwork({ quality }) {
  const group = useRef();
  const nodes = quality.aiNodes;
  const points = useMemo(() => fibonacciSphere(nodes, 0.95), [nodes]);
  const lines = useMemo(() => {
    const verts = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 0.72) {
          verts.push(points[i], points[j]);
        }
      }
    }
    return new THREE.BufferGeometry().setFromPoints(verts);
  }, [points]);
  const cloud = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.72, 0.76, 0.84, 0.9);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y += delta * 0.12 * visible;
    group.current.rotation.x = Math.sin(p * 8) * 0.08;
  });

  return (
    <group ref={group} position={[0, 0.9, 0]}>
      <points geometry={cloud}>
        <pointsMaterial color="#ddd6fe" size={0.035} sizeAttenuation transparent opacity={0.9} />
      </points>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}
