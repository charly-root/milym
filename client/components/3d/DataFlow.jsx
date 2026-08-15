import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity } from "../../utils/math.js";

export function DataFlow({ quality }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = Math.max(8, Math.floor(quality.particles / 2));
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.3, 0.6),
        new THREE.Vector3(0.4, 1.1, 0.1),
        new THREE.Vector3(0.8, 0.7, -0.2),
        new THREE.Vector3(0.2, 0.25, -0.35),
        new THREE.Vector3(-0.3, 0.2, -0.5),
        new THREE.Vector3(-0.1, 0.7, 0.1),
        new THREE.Vector3(0, 1.3, 0.6)
      ]),
    []
  );

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.5, 0.58, 0.82, 0.9);
    if (!mesh.current) return;
    mesh.current.visible = visible > 0.01;
    if (!mesh.current.visible) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const u = (t * 0.06 + i / count) % 1;
      const point = curve.getPointAt(u);
      dummy.position.copy(point);
      dummy.scale.setScalar(0.025);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#e9d5ff" transparent opacity={0.85} />
    </instancedMesh>
  );
}
