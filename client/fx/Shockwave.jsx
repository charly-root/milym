import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { STAGE } from "../stage.js";
import { between } from "../utils/acts.js";
import { faceCamera } from "../utils/billboard.js";

/**
 * L'onde de choc de l'allumage du noyau : un anneau doux (dégradé radial, pas
 * de bord dur) qui jaillit du centre et s'évanouit en s'élargissant. Piloté
 * par le scroll, donc rejouable dans les deux sens.
 */
function createRingTexture() {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.72, "rgba(255,255,255,0)");
  gradient.addColorStop(0.86, "rgba(255,240,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Shockwave({ range = [0.872, 0.935] }) {
  const ring = useRef();
  const { camera } = useThree();
  const gradient = useMemo(createRingTexture, []);

  useFrame(() => {
    if (!ring.current) return;
    const t = between(experienceStore.progress, range[0], range[1]);
    const active = t > 0.001 && t < 0.999;

    ring.current.visible = active;
    if (!active) return;

    ring.current.scale.setScalar(0.3 + t * 6.5);
    ring.current.material.opacity = Math.pow(1 - t, 1.6);
    faceCamera(ring.current, camera);
  });

  return (
    <mesh ref={ring} position={STAGE.center} visible={false}>
      <planeGeometry args={[2.1, 2.1]} />
      <meshBasicMaterial
        map={gradient}
        color={[1.7, 1.2, 2.9]}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
