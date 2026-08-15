import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { sampleKeyframes, lerp } from "../../utils/math.js";

/**
 * La caméra raconte, elle ne tourne pas pour tourner : elle se penche sur la
 * feuille, se redresse avec elle, s'écarte pour montrer l'épaisseur de
 * l'application, puis revient de face pour la fin.
 *
 * Règle de cadrage : le sujet du moment occupe environ deux tiers de la
 * largeur. La caméra reste toujours à l'extérieur de la scène — y entrer
 * donnait des plans illisibles où tout débordait du cadre.
 */
const KEYFRAMES = [
  { p: 0.0, pos: [0.5, 2.15, 1.7], look: [0.0, 0.04, 0.02], fov: 38 },
  { p: 0.07, pos: [0.28, 1.88, 1.5], look: [0.0, 0.04, 0.0], fov: 35 },
  { p: 0.15, pos: [0.2, 1.95, 1.9], look: [0.0, 0.3, 0.0], fov: 35 },
  { p: 0.24, pos: [0.05, 1.22, 3.0], look: [0.0, 1.16, 0.0], fov: 34 },
  { p: 0.33, pos: [0.0, 1.2, 3.05], look: [0.0, 1.18, 0.0], fov: 33 },
  { p: 0.45, pos: [0.0, 1.19, 2.9], look: [0.0, 1.18, 0.0], fov: 32 },
  { p: 0.55, pos: [3.0, 1.65, 1.35], look: [0.0, 1.15, -0.85], fov: 40 },
  { p: 0.65, pos: [3.1, 1.55, 0.5], look: [0.0, 1.12, -1.7], fov: 40 },
  { p: 0.73, pos: [2.4, 1.3, -0.5], look: [0.0, 1.02, -2.6], fov: 40 },
  { p: 0.79, pos: [3.2, 2.1, -0.4], look: [1.5, 1.72, -2.9], fov: 38 },
  { p: 0.825, pos: [1.6, 1.55, 1.4], look: [0.0, 1.2, -0.8], fov: 38 },
  { p: 0.87, pos: [0.1, 1.22, 4.1], look: [0.0, 1.16, 0.0], fov: 36 },
  { p: 0.93, pos: [0.0, 1.3, 5.0], look: [0.0, 1.12, 0.0], fov: 42 },
  { p: 0.975, pos: [0.0, 1.16, 3.05], look: [0.0, 1.12, 0.0], fov: 38 },
  { p: 1.0, pos: [0.0, 1.2, 4.4], look: [0.0, 1.08, 0.0], fov: 40 }
];

const PARALLAX = 0.1;

/** Les cadrages ci-dessus sont réglés pour un écran large. */
const REFERENCE_ASPECT = 16 / 9;
const MAX_FOV = 58;
const DEG = Math.PI / 180;

/**
 * Sur un écran étroit, la même focale coupe le sujet sur les côtés. On répartit
 * la correction entre l'ouverture et le recul : tout en focale déformerait la
 * perspective, tout en recul réduirait le sujet à un timbre-poste.
 */
function fitToViewport(aspect, fov) {
  const need = Math.max(1, REFERENCE_ASPECT / aspect);
  const share = Math.sqrt(need);
  const halfTangent = Math.tan((fov * DEG) / 2);
  let widened = (2 * Math.atan(halfTangent * share)) / DEG;
  let distance = share;

  if (widened > MAX_FOV) {
    const capped = Math.tan((MAX_FOV * DEG) / 2) / halfTangent;
    distance = need / capped;
    widened = MAX_FOV;
  }

  return { fov: widened, distance, drop: Math.min(need - 1, 1.2) * 0.3 };
}

export function CameraRig() {
  const { camera } = useThree();
  const look = useRef({ x: 0, y: 0.04, z: 0 });

  useFrame((_, delta) => {
    const frame = sampleKeyframes(KEYFRAMES, experienceStore.progress);
    const fit = fitToViewport(camera.aspect, frame.fov);
    const px = experienceStore.pointer.x * PARALLAX;
    const py = experienceStore.pointer.y * PARALLAX * 0.5;
    const k = 1 - Math.pow(0.008, Math.min(delta, 0.05));

    const targetX = frame.look[0] + px * 0.2;
    const targetY = frame.look[1] - py * 0.12 - fit.drop;
    const targetZ = frame.look[2];

    look.current.x = lerp(look.current.x, targetX, k);
    look.current.y = lerp(look.current.y, targetY, k);
    look.current.z = lerp(look.current.z, targetZ, k);

    camera.position.x = lerp(camera.position.x, targetX + (frame.pos[0] + px - targetX) * fit.distance, k);
    camera.position.y = lerp(camera.position.y, targetY + (frame.pos[1] + py - targetY) * fit.distance, k);
    camera.position.z = lerp(camera.position.z, targetZ + (frame.pos[2] - targetZ) * fit.distance, k);
    camera.lookAt(look.current.x, look.current.y, look.current.z);

    if (Math.abs(camera.fov - fit.fov) > 0.01) {
      camera.fov = lerp(camera.fov, fit.fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
