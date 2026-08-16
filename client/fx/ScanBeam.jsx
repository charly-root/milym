import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { STAGE } from "../stage.js";
import { between } from "../utils/acts.js";

/**
 * Le trait de lumière qui « numérise » la feuille : une barre incandescente
 * balaie l'écran de bas en haut, doublée d'un voile dégradé qui s'éteint vers
 * ses bords. Les couleurs dépassent 1 exprès : c'est le bloom qui fait le reste.
 */
function createVeilTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function ScanBeam({ range }) {
  const group = useRef();
  const bar = useRef();
  const veil = useRef();
  const gradient = useMemo(createVeilTexture, []);
  const travel = STAGE.screen.height + 0.3;

  useFrame(() => {
    if (!group.current) return;
    const sweep = between(experienceStore.progress, range[0], range[1]);
    const active = sweep > 0.001 && sweep < 0.999;

    group.current.visible = active;
    if (!active) return;

    const strength = Math.sin(Math.PI * sweep);
    group.current.position.y = STAGE.center[1] - travel / 2 + sweep * travel;
    bar.current.material.opacity = strength;
    veil.current.material.opacity = strength * 0.4;
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1], STAGE.center[2] + 0.045]} visible={false}>
      <mesh ref={bar}>
        <planeGeometry args={[STAGE.screen.width + 0.18, 0.016]} />
        <meshBasicMaterial
          color={[2.6, 2.1, 3.6]}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={veil}>
        <planeGeometry args={[STAGE.screen.width + 0.18, 0.5]} />
        <meshBasicMaterial
          map={gradient}
          color={[1.1, 0.85, 1.9]}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
