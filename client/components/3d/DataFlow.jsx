import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";

/**
 * Pendant le backend uniquement : des paquets circulent sur le bus
 * API → Node.js → Auth. Ensuite la base et l'IA portent leur propre lecture.
 */
export function DataFlow({ quality }) {
  const request = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = Math.max(10, Math.round(quality.particles / 2.2));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const visible = between(p, 0.62, 0.655) * (1 - between(p, 0.685, 0.715));
    const mesh = request.current;
    if (!mesh) return;
    mesh.visible = visible > 0.02;
    mesh.material.opacity = 0.95 * visible;
    if (!mesh.visible) return;

    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const u = (t * 0.18 + i / count) % 1;
      dummy.position.set(-1.15 + u * 2.3, Math.sin(u * Math.PI) * 0.04, 0);
      dummy.scale.setScalar(0.022 + (i % 3 === 0 ? 0.01 : 0));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[STAGE.center[0], STAGE.center[1], STAGE.backendZ]}>
      <instancedMesh ref={request} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#f5e9ff" transparent opacity={0.95} />
      </instancedMesh>
    </group>
  );
}
