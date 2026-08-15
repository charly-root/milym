import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";

/**
 * Le trajet d'une requête. Elle part de l'interface, traverse les couches
 * jusqu'à la base, et la réponse revient par la voie opposée.
 */
export function DataFlow({ quality }) {
  const request = useRef();
  const response = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = Math.max(6, Math.round(quality.particles / 3));
  const start = 0.08;
  const end = STAGE.databaseZ;

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const visible = between(p, 0.52, 0.6) * (1 - between(p, 0.83, 0.88));
    const lanes = [request.current, response.current];
    lanes.forEach((lane) => {
      if (lane) {
        lane.visible = visible > 0.01;
        lane.material.opacity = 0.85 * visible;
      }
    });
    if (visible <= 0.01) return;

    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const u = (t * 0.11 + i / count) % 1;

      dummy.position.set(0, 0, THREE.MathUtils.lerp(start, end, u));
      dummy.scale.setScalar(0.022);
      dummy.updateMatrix();
      request.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(0, 0, THREE.MathUtils.lerp(end, start, u));
      dummy.scale.setScalar(0.022);
      dummy.updateMatrix();
      response.current?.setMatrixAt(i, dummy.matrix);
    }
    if (request.current) request.current.instanceMatrix.needsUpdate = true;
    if (response.current) response.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[STAGE.center[0], STAGE.center[1] - 0.62, 0]}>
      <instancedMesh ref={request} args={[undefined, undefined, count]} position={[0.42, 0, 0]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#e9d5ff" transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={response} args={[undefined, undefined, count]} position={[-0.42, 0, 0]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.85} />
      </instancedMesh>
    </group>
  );
}
