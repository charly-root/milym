import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { sampleKeyframes, lerp } from "../../utils/math.js";

/**
 * La caméra joue la mise en scène : plongée lente sur le bureau, contre-plongée
 * héroïque quand la feuille se lève, coup de zoom sur la numérisation, travée
 * latérale avec un léger roulis pour longer l'épaisseur de l'application,
 * recul brutal avant l'implosion, grand large sur la galaxie, et remontée
 * douce vers la constellation finale.
 *
 * Le roulis reste sous trois degrés : assez pour donner du mouvement, jamais
 * assez pour donner le mal de mer.
 */
const KEYFRAMES = [
  { p: 0.0, pos: [0.85, 2.5, 2.0], look: [0.0, 0.05, 0.02], fov: 38 },
  { p: 0.06, pos: [0.3, 1.85, 1.5], look: [0.0, 0.05, 0.0], fov: 34 },
  { p: 0.13, pos: [0.55, 1.05, 2.0], look: [0.0, 0.55, 0.0], fov: 37, roll: -1.2 },
  { p: 0.22, pos: [0.0, 1.3, 2.95], look: [0.0, 1.14, 0.0], fov: 33 },
  { p: 0.275, pos: [0.0, 1.18, 2.35], look: [0.0, 1.15, 0.0], fov: 30 },
  { p: 0.34, pos: [0.0, 1.2, 3.0], look: [0.0, 1.16, 0.0], fov: 33 },
  { p: 0.46, pos: [0.35, 1.25, 2.7], look: [0.0, 1.16, 0.0], fov: 31, roll: 0.8 },
  { p: 0.55, pos: [2.9, 1.7, 1.5], look: [0.0, 1.14, -0.8], fov: 40, roll: 2.4 },
  { p: 0.64, pos: [2.9, 1.55, 0.4], look: [0.0, 1.1, -1.7], fov: 42, roll: 1.5 },
  { p: 0.72, pos: [1.9, 1.35, -0.5], look: [0.0, 1.03, -2.6], fov: 42 },
  { p: 0.79, pos: [3.0, 2.25, -1.1], look: [1.5, 1.72, -2.85], fov: 34, roll: -1.5 },
  { p: 0.83, pos: [1.9, 1.7, 2.2], look: [0.0, 1.2, -0.5], fov: 38 },
  { p: 0.875, pos: [0.05, 1.25, 4.2], look: [0.0, 1.15, 0.0], fov: 34 },
  { p: 0.9, pos: [0.0, 1.5, 4.6], look: [0.0, 1.13, 0.0], fov: 38 },
  { p: 0.93, pos: [0.0, 3.5, 4.2], look: [0.0, 0.9, 0.0], fov: 42 },
  { p: 0.965, pos: [0.0, 1.35, 3.2], look: [0.0, 1.2, 0.0], fov: 38 },
  { p: 1.0, pos: [0.0, 1.5, 4.5], look: [0.0, 1.38, 0.0], fov: 41 }
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
  const roll = useRef(0);

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

    // Roulis appliqué après le lookAt : il ne s'accumule donc jamais.
    roll.current = lerp(roll.current, frame.roll || 0, k);
    if (Math.abs(roll.current) > 0.01) camera.rotateZ(roll.current * DEG);

    if (Math.abs(camera.fov - fit.fov) > 0.01) {
      camera.fov = lerp(camera.fov, fit.fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
