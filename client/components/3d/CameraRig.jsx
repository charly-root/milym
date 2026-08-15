import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { sampleKeyframes, lerp } from "../../utils/math.js";

/**
 * La caméra raconte, elle ne tourne pas pour tourner : elle descend vers la
 * feuille, se redresse avec elle, longe l'architecture par le côté, puis
 * revient de face pour la fin.
 */
const KEYFRAMES = [
  { p: 0.0, pos: [0.6, 1.62, 1.62], look: [0.0, 0.16, 0.06], fov: 40 },
  { p: 0.07, pos: [0.34, 1.42, 1.34], look: [0.0, 0.12, 0.04], fov: 36 },
  { p: 0.15, pos: [0.16, 1.34, 1.85], look: [0.0, 0.58, 0.02], fov: 35 },
  { p: 0.24, pos: [0.04, 1.2, 2.42], look: [0.0, 1.1, 0.0], fov: 34 },
  { p: 0.33, pos: [0.0, 1.16, 2.55], look: [0.0, 1.15, 0.0], fov: 33 },
  { p: 0.45, pos: [0.0, 1.15, 2.28], look: [0.0, 1.15, 0.0], fov: 32 },
  { p: 0.55, pos: [1.72, 1.42, 2.05], look: [0.0, 1.1, -0.7], fov: 40 },
  { p: 0.65, pos: [2.25, 1.32, 1.1], look: [0.0, 1.05, -1.5], fov: 40 },
  { p: 0.73, pos: [1.9, 1.14, -0.55], look: [0.0, 0.98, -2.9], fov: 40 },
  { p: 0.79, pos: [1.5, 1.66, -0.5], look: [-0.5, 1.52, -2.85], fov: 38 },
  { p: 0.825, pos: [1.3, 1.45, 1.3], look: [0.0, 1.15, -0.6], fov: 38 },
  { p: 0.87, pos: [0.1, 1.2, 3.4], look: [0.0, 1.15, 0.0], fov: 36 },
  { p: 0.93, pos: [0.0, 1.28, 4.5], look: [0.0, 1.12, 0.0], fov: 42 },
  { p: 0.975, pos: [0.0, 1.16, 3.05], look: [0.0, 1.12, 0.0], fov: 38 },
  { p: 1.0, pos: [0.0, 1.2, 3.9], look: [0.0, 1.08, 0.0], fov: 40 }
];

const PARALLAX = 0.1;

export function CameraRig() {
  const { camera } = useThree();
  const look = useRef({ x: 0, y: 0.2, z: 0 });

  useFrame((_, delta) => {
    const frame = sampleKeyframes(KEYFRAMES, experienceStore.progress);
    const px = experienceStore.pointer.x * PARALLAX;
    const py = experienceStore.pointer.y * PARALLAX * 0.5;
    const k = 1 - Math.pow(0.008, Math.min(delta, 0.05));

    camera.position.x = lerp(camera.position.x, frame.pos[0] + px, k);
    camera.position.y = lerp(camera.position.y, frame.pos[1] + py, k);
    camera.position.z = lerp(camera.position.z, frame.pos[2], k);

    look.current.x = lerp(look.current.x, frame.look[0] + px * 0.2, k);
    look.current.y = lerp(look.current.y, frame.look[1] - py * 0.12, k);
    look.current.z = lerp(look.current.z, frame.look[2], k);
    camera.lookAt(look.current.x, look.current.y, look.current.z);

    if (Math.abs(camera.fov - frame.fov) > 0.01) {
      camera.fov = lerp(camera.fov, frame.fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
