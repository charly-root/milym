import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { STAGE } from "../stage.js";
import { between } from "../utils/acts.js";

/**
 * Étincelles plus grosses que la nappe : elles soulignent les actes machine
 * (couches, backend, données) sans remplacer le morphing principal.
 */
export function SparkTrails({ quality }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = Math.max(36, Math.min(220, Math.round(quality.particles * 2.8)));
  const seeds = useMemo(() => {
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) out[i] = Math.random();
    return out;
  }, [count]);

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const layers = between(p, 0.49, 0.6);
    const backend = between(p, 0.61, 0.72);
    const data = between(p, 0.69, 0.785);
    const ambient = between(p, 0.2, 0.38) * 0.45 + between(p, 0.4, 0.52) * 0.35;
    const visible = Math.max(layers, backend, data, ambient);
    const inst = mesh.current;
    if (!inst) return;
    inst.visible = visible > 0.03;
    inst.material.opacity = 0.9 * visible;
    if (!inst.visible) return;

    const portrait = experienceStore.portrait;
    const spread = experienceStore.spreadY || 1;
    const t = clock.elapsedTime;
    const cx = STAGE.center[0];
    const cy = STAGE.center[1];
    const mid = (STAGE.layerCount - 1) / 2;

    for (let i = 0; i < count; i++) {
      const s0 = seeds[i * 3];
      const s1 = seeds[i * 3 + 1];
      const s2 = seeds[i * 3 + 2];
      const u = (t * (0.12 + s0 * 0.22) + s1) % 1;
      let x = cx + (s0 - 0.5) * 1.8;
      let y = cy + (s1 - 0.5) * 1.1 * spread;
      let z = (s2 - 0.5) * 1.2;
      let scale = 0.018 + s2 * 0.02;

      if (layers >= backend && layers >= data && layers > 0.04) {
        const layer = Math.floor(s0 * STAGE.layerCount);
        if (portrait) {
          x = cx + (layer - mid) * 0.07 + (s1 - 0.5) * 0.7;
          y = cy + (mid - layer) * STAGE.layerGapY + (s2 - 0.5) * 0.28;
          z = -layer * STAGE.layerGap * 0.32;
        } else {
          x = cx + (s1 - 0.5) * STAGE.screen.width;
          y = cy + (s2 - 0.5) * STAGE.screen.height;
          z = -layer * STAGE.layerGap;
        }
        scale = 0.016 + s2 * 0.012;
      } else if (backend >= data && backend > 0.04) {
        if (portrait) {
          x = cx + Math.sin(u * Math.PI * 2 + s0 * 6) * 0.28;
          y = cy + 1.18 - u * 2.36;
          z = STAGE.backendZ + (s2 - 0.5) * 0.2;
        } else {
          x = cx - 1.2 + u * 2.4;
          y = cy + Math.sin(u * Math.PI * 2 + s0 * 8) * 0.12;
          z = STAGE.backendZ + (s2 - 0.5) * 0.18;
        }
        scale = 0.018 + s1 * 0.01;
      } else if (data > 0.04) {
        const angle = u * Math.PI * 2 + s0 * 6.28;
        const r = 0.28 + s1 * 0.42;
        if (portrait) {
          x = cx + Math.cos(angle) * r;
          y = cy - 1.12 + (s2 - 0.5) * 0.5;
          z = STAGE.databaseZ + Math.sin(angle) * r;
        } else {
          x = cx + 0.7 + Math.cos(angle) * r;
          y = cy + (s2 - 0.5) * 0.7;
          z = STAGE.databaseZ + Math.sin(angle) * r;
        }
        scale = 0.016 + s2 * 0.012;
      }

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale * (0.85 + visible * 0.25));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#f3e8ff" transparent opacity={0.9} depthWrite={false} />
    </instancedMesh>
  );
}
