import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { sampleKeyframes, lerp } from "../../utils/math.js";

const KEYFRAMES = [
  { p: 0.0, pos: [0.62, 2.05, 4.35], look: [0.04, 0.7, 0.05], fov: 36 },
  { p: 0.08, pos: [0.1, 1.62, 2.2], look: [0, 0.9, 0], fov: 32 },
  { p: 0.16, pos: [0.0, 1.48, 1.7], look: [0, 0.96, 0], fov: 30 },
  { p: 0.24, pos: [0.15, 1.32, 2.55], look: [0, 1.08, 0.05], fov: 32 },
  { p: 0.34, pos: [0.0, 1.22, 3.2], look: [0, 1.18, 0], fov: 34 },
  { p: 0.44, pos: [0.0, 1.18, 2.65], look: [0, 1.22, 0], fov: 32 },
  { p: 0.52, pos: [2.15, 1.45, 3.35], look: [0, 1.05, -0.15], fov: 38 },
  { p: 0.6, pos: [2.8, 1.55, 2.2], look: [0.15, 0.95, -0.4], fov: 40 },
  { p: 0.68, pos: [1.5, 0.55, 3.55], look: [0, 0.15, -0.55], fov: 38 },
  { p: 0.76, pos: [-1.7, 1.35, 3.3], look: [0, 0.75, -0.2], fov: 36 },
  { p: 0.84, pos: [0.25, 1.28, 4.1], look: [0, 0.95, 0], fov: 34 },
  { p: 0.91, pos: [0.0, 1.85, 7.4], look: [0, 0.55, 0], fov: 42 },
  { p: 0.97, pos: [0.0, 1.12, 4.6], look: [0, 0.95, 0], fov: 35 },
  { p: 1.0, pos: [0.0, 1.4, 6.4], look: [0, 0.8, 0], fov: 40 }
];

export function CameraRig() {
  const { camera } = useThree();
  const look = useRef({ x: 0, y: 0.7, z: 0 });

  useFrame((_, delta) => {
    const frame = sampleKeyframes(KEYFRAMES, experienceStore.progress);
    const parallax = 0.18;
    const px = experienceStore.pointer.x * parallax;
    const py = experienceStore.pointer.y * parallax * 0.6;
    const k = 1 - Math.pow(0.012, delta);

    camera.position.x = lerp(camera.position.x, frame.pos[0] + px, k);
    camera.position.y = lerp(camera.position.y, frame.pos[1] + py, k);
    camera.position.z = lerp(camera.position.z, frame.pos[2], k);

    look.current.x = lerp(look.current.x, frame.look[0] + px * 0.25, k);
    look.current.y = lerp(look.current.y, frame.look[1] - py * 0.15, k);
    look.current.z = lerp(look.current.z, frame.look[2], k);
    camera.lookAt(look.current.x, look.current.y, look.current.z);

    camera.fov = lerp(camera.fov, frame.fov, k);
    camera.updateProjectionMatrix();
  });

  return null;
}
