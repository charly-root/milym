import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";

/**
 * Paquets lumineux qui relient les actes machine : ils traversent la pile de
 * couches, le bus backend, puis la table vers les disques.
 */
export function DataFlow({ quality }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = Math.max(22, Math.round(quality.particles * 1.15));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const layers = between(p, 0.5, 0.58) * (1 - between(p, 0.6, 0.64));
    const backend = between(p, 0.615, 0.655) * (1 - between(p, 0.688, 0.722));
    const data = between(p, 0.7, 0.74) * (1 - between(p, 0.76, 0.79));
    const visible = Math.max(layers, backend, data);
    const inst = mesh.current;
    if (!inst) return;
    inst.visible = visible > 0.02;
    inst.material.opacity = 0.98 * visible;
    if (!inst.visible) return;

    const portrait = experienceStore.portrait;
    const t = clock.elapsedTime;
    const cx = STAGE.center[0];
    const cy = STAGE.center[1];
    const mid = (STAGE.layerCount - 1) / 2;

    for (let i = 0; i < count; i++) {
      const u = (t * 0.22 + i / count) % 1;
      let x = cx;
      let y = cy;
      let z = STAGE.backendZ;
      let scale = 0.028 + (i % 4 === 0 ? 0.014 : 0);

      if (layers >= backend && layers >= data) {
        const layer = u * (STAGE.layerCount - 1);
        if (portrait) {
          x = cx + (layer - mid) * 0.07;
          y = cy + (mid - layer) * STAGE.layerGapY;
          z = -layer * STAGE.layerGap * 0.32;
          scale *= 0.85;
        } else {
          z = -layer * STAGE.layerGap;
          y = cy + Math.sin(u * Math.PI * 4 + i) * 0.06;
          x = cx + ((i % 5) - 2) * 0.22;
        }
      } else if (backend >= data) {
        if (portrait) {
          x = cx;
          y = cy + 1.18 - u * 2.36;
          z = STAGE.backendZ;
        } else {
          x = cx - 1.15 + u * 2.3;
          y = cy + Math.sin(u * Math.PI) * 0.05;
          z = STAGE.backendZ;
        }
      } else if (portrait) {
        x = cx + Math.sin(u * Math.PI * 2 + i) * 0.18;
        y = cy + 1.15 - u * 2.3;
        z = STAGE.databaseZ + Math.cos(u * Math.PI * 2) * 0.12;
      } else {
        x = cx - 1.05 + u * 1.7;
        y = cy + Math.sin(u * Math.PI) * 0.08;
        z = STAGE.databaseZ + Math.sin(u * Math.PI * 2) * 0.16;
      }

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#f5e9ff" transparent opacity={0.95} depthWrite={false} />
    </instancedMesh>
  );
}
