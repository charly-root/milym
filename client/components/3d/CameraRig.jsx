import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { BOOM, EARTH, PROLOGUE, STAGE, portraitAmount } from "../../stage.js";
import { sampleKeyframes, lerp, smoothstep } from "../../utils/math.js";
import { tickCinemaAudio } from "../../fx/cinemaSound.js";

/**
 * La caméra joue la mise en scène : d'abord le prologue — la Terre de nuit,
 * la météorite, l'impact, un recul sur les débris — puis le récit, en plans
 * tenus plutôt qu'en travellings nerveux.
 *
 * Le chemin est lu tel quel (peu de lag) : le smoothing par cran était la
 * source du stop-start. Le roulis reste sous un degré.
 */
const impact = [
  EARTH.center[0] + 0.12,
  EARTH.center[1] + 0.28,
  EARTH.center[2] + EARTH.radius * 0.95
];

const FLASH_DIVE = 0.148;

const PROLOGUE_KEYFRAMES = [
  { p: 0.0, pos: [2.6, 3.8, 48], look: [0.5, 2.35, 22], fov: 30 },
  { p: 0.028, pos: [2.1, 3.2, 42], look: EARTH.center, fov: 28 },
  { p: 0.052, pos: [1.2, 2.5, 35], look: impact, fov: 25 },
  { p: 0.07, pos: [0.55, 1.85, 29.5], look: impact, fov: 23 },
  { p: BOOM.start, pos: [0.32, 1.58, 26.2], look: impact, fov: 20 },
  { p: BOOM.peak, pos: [0.55, 1.95, 28.5], look: EARTH.center, fov: 30 },
  { p: 0.118, pos: [1.05, 2.55, 33], look: EARTH.center, fov: 34 },
  { p: FLASH_DIVE, pos: [0.7, 2.2, 12], look: [0.0, 0.55, 0.1], fov: 34 },
  { p: PROLOGUE, pos: [0.55, 2.15, 2.35], look: [0.0, 0.1, 0.05], fov: 36 }
];

/** Le récit, en progrès récit (0 → 1) : remappé après le prologue. */
const STORY_KEYFRAMES = [
  { p: 0.0, pos: [0.55, 2.15, 2.35], look: [0.0, 0.1, 0.05], fov: 36 },
  { p: 0.08, pos: [0.16, 1.52, 1.62], look: [0.0, 0.3, 0.02], fov: 32 },
  { p: 0.16, pos: [0.02, 1.22, 2.15], look: [0.0, 0.82, 0.0], fov: 32 },
  { p: 0.26, pos: [0.0, 1.18, 2.05], look: [0.0, 1.15, 0.0], fov: 28 },
  { p: 0.36, pos: [0.0, 1.2, 2.55], look: [0.0, 1.16, 0.0], fov: 32 },
  { p: 0.48, pos: [0.22, 1.24, 2.65], look: [0.0, 1.16, 0.0], fov: 32 },
  { p: 0.55, pos: [2.85, 2.05, 2.85], look: [0.05, 1.12, -1.3], fov: 32 },
  { p: 0.62, pos: [0.0, 1.38, 3.4], look: [0.0, 1.2, -1.45], fov: 34 },
  { p: 0.73, pos: [1.4, 1.82, 2.7], look: [0.0, 1.1, -1.45], fov: 34 },
  { p: 0.8, pos: [0.0, 1.38, 3.3], look: [0.0, 1.22, -1.45], fov: 34 },
  { p: 0.845, pos: [0.0, 1.55, 3.85], look: [0.0, 1.16, -0.35], fov: 36 },
  { p: 0.893, pos: [0.2, 3.62, 3.05], look: [0.0, 1.12, 0.0], fov: 38 },
  { p: 0.935, pos: [0.0, 2.55, 4.4], look: [0.0, 1.1, 0.0], fov: 40 },
  { p: 0.96, pos: [0.0, 1.52, 3.85], look: [0.0, 1.48, 0.0], fov: 38 },
  { p: 1.0, pos: [0.0, 1.58, 4.55], look: [0.0, 1.52, 0.0], fov: 40 }
];

const KEYFRAMES = [
  ...PROLOGUE_KEYFRAMES,
  ...STORY_KEYFRAMES.filter((frame) => frame.p > 0).map((frame) => ({
    ...frame,
    p: PROLOGUE + frame.p * (1 - PROLOGUE)
  }))
];

const PARALLAX = 0.045;

const REFERENCE_ASPECT = 16 / 9;
const MAX_FOV = 54;
const DEG = Math.PI / 180;

function fitToViewport(aspect, fov, storyP) {
  const need = Math.max(1, REFERENCE_ASPECT / aspect);
  const amount = portraitAmount(aspect);
  const portrait = amount > 0;
  const share = Math.sqrt(need);
  const stack = storyP > 0.47 && storyP < 0.86;
  const maxFov = portrait ? (stack ? 44 : 54) : MAX_FOV;
  const halfTangent = Math.tan((fov * DEG) / 2);
  const widthShare = stack && portrait ? Math.min(share, 1.12) : share;
  let widened = (2 * Math.atan(halfTangent * widthShare)) / DEG;
  const pull = portrait ? (stack ? 0.84 : 0.9) : 1;
  let distance = (stack && portrait ? 1 : share) * pull;

  if (widened > maxFov) {
    const capped = Math.tan((maxFov * DEG) / 2) / halfTangent;
    distance = (stack && portrait ? 1 : need / capped) * pull;
    widened = maxFov;
  }

  const drop = portrait ? (stack ? 0.06 : 0.04) : Math.min(need - 1, 1.4) * 0.26;

  return { fov: widened, distance, drop, amount, stack };
}

export function CameraRig() {
  const { camera } = useThree();
  const look = useRef({ x: EARTH.center[0], y: EARTH.center[1], z: EARTH.center[2] });
  const roll = useRef(0);

  useFrame(({ clock }, delta) => {
    const raw = experienceStore.rawProgress;
    const storyP = experienceStore.progress;
    tickCinemaAudio(raw, storyP);

    const storyRoot = document.getElementById("home-story");
    if (storyP < 0.95 && experienceStore.rangeMode) {
      experienceStore.rangeMode = false;
      experienceStore.logoClicks = 0;
      experienceStore.pendingShot = null;
    }
    storyRoot?.classList.toggle("is-range", experienceStore.rangeMode);

    const dt = Math.min(delta, 0.05);
    const follow = 1 - Math.exp(-18 * dt);

    if (experienceStore.rangeMode) {
      const tx = STAGE.center[0];
      const ty = STAGE.center[1] + 0.22;
      const tz = STAGE.center[2] + 0.42;
      look.current.x = lerp(look.current.x, tx, follow);
      look.current.y = lerp(look.current.y, ty, follow);
      look.current.z = lerp(look.current.z, tz, follow);
      camera.position.x = lerp(camera.position.x, tx + 0.12, follow);
      camera.position.y = lerp(camera.position.y, ty + 0.04, follow);
      camera.position.z = lerp(camera.position.z, tz + 2.35, follow);
      camera.lookAt(look.current.x, look.current.y, look.current.z);
      const fov = 38;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = lerp(camera.fov, fov, follow);
        camera.updateProjectionMatrix();
      }
      return;
    }

    const frame = sampleKeyframes(KEYFRAMES, raw);
    const fit = fitToViewport(camera.aspect, frame.fov, storyP);
    experienceStore.portrait = fit.amount > 0.04;
    experienceStore.spreadY = 1 + fit.amount * 0.72;

    const inSpace = raw < PROLOGUE - 0.01;
    const parallax = experienceStore.tier === "mobile" || inSpace ? 0 : PARALLAX;
    const px = experienceStore.pointer.x * parallax;
    const py = experienceStore.pointer.y * parallax * 0.5;

    let posX = frame.pos[0];
    let posY = frame.pos[1];
    let posZ = frame.pos[2];
    let lookX = frame.look[0];
    let lookY = frame.look[1];
    let lookZ = frame.look[2];

    if (fit.amount > 0 && fit.stack) {
      const a = fit.amount;
      posX = lerp(posX, posX * 0.08, a);
      posY = lerp(posY, STAGE.center[1] + 0.12, a * 0.4);
      posZ = lerp(posZ, 2.85, a);
      lookX = lerp(lookX, 0, a);
      lookY = lerp(lookY, STAGE.center[1], a * 0.6);
      lookZ = lerp(lookZ, -0.35, a * 0.5);
    } else if (fit.amount > 0) {
      lookY += fit.amount * 0.08;
    }

    const targetX = lookX + px * 0.2;
    const targetY = lookY - py * 0.12 - fit.drop;
    const targetZ = lookZ;

    look.current.x = lerp(look.current.x, targetX, follow);
    look.current.y = lerp(look.current.y, targetY, follow);
    look.current.z = lerp(look.current.z, targetZ, follow);

    camera.position.x = lerp(camera.position.x, targetX + (posX + px - targetX) * fit.distance, follow);
    camera.position.y = lerp(camera.position.y, targetY + (posY + py - targetY) * fit.distance, follow);
    camera.position.z = lerp(camera.position.z, targetZ + (posZ - targetZ) * fit.distance, follow);

    const shake =
      smoothstep(BOOM.start, BOOM.start + 0.006, raw) * (1 - smoothstep(BOOM.peak, BOOM.peak + 0.018, raw));
    if (shake > 0.001) {
      const t = clock.elapsedTime;
      const amp = shake * 0.14;
      camera.position.x += Math.sin(t * 28) * amp;
      camera.position.y += Math.cos(t * 33) * amp * 0.55;
    }

    camera.lookAt(look.current.x, look.current.y, look.current.z);

    roll.current = lerp(roll.current, frame.roll || 0, follow);
    if (Math.abs(roll.current) > 0.01) camera.rotateZ(roll.current * DEG);

    if (Math.abs(camera.fov - fit.fov) > 0.01) {
      camera.fov = lerp(camera.fov, fit.fov, follow);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
