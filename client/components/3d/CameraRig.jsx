import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { BOOM, EARTH, PROLOGUE, STAGE, portraitAmount } from "../../stage.js";
import { sampleKeyframes, lerp, smoothstep } from "../../utils/math.js";

/**
 * La caméra joue la mise en scène : d'abord le prologue — la France de nuit
 * vue de l'espace, puis une plongée jusqu'à ce que ses lumières remplissent
 * l'écran (le flash couvre le raccord vers le bureau) — puis le récit :
 * plongée lente sur le bureau, contre-plongée quand la feuille se lève, coup
 * de zoom sur la numérisation, travée latérale avec un léger roulis, recul
 * avant l'implosion, plongée sur la galaxie et remontée douce vers la
 * constellation finale.
 *
 * Le roulis reste sous trois degrés : assez pour donner du mouvement, jamais
 * assez pour donner le mal de mer.
 */
const FRANCE = EARTH.france.map((v, i) => EARTH.center[i] + v * EARTH.radius);
const approach = (d) => EARTH.france.map((v, i) => EARTH.center[i] + v * (EARTH.radius + d));

/**
 * Prologue, en progrès brut : la France déjà face caméra, la plongée, puis la
 * détonation. La caméra est rejetée en arrière par le souffle (recul +
 * ouverture de focale) pour laisser l'explosion remplir le cadre.
 */
const PROLOGUE_KEYFRAMES = [
  { p: 0.0, pos: approach(7.6), look: EARTH.center, fov: 36 },
  { p: 0.045, pos: approach(5.5), look: FRANCE, fov: 34 },
  { p: 0.062, pos: approach(4.4), look: FRANCE, fov: 33 },
  { p: BOOM.start, pos: approach(2.4), look: FRANCE, fov: 28 },
  // Rejetée par le souffle — mais pas trop loin : les débris doivent frôler
  // l'objectif pour que l'explosion se vive de l'intérieur.
  { p: 0.0935, pos: approach(6.2), look: EARTH.center, fov: 44 }
];

/** Le récit, en progrès récit (0 → 1) : remappé après le prologue. */
const STORY_KEYFRAMES = [
  { p: 0.0, pos: [0.85, 2.5, 2.0], look: [0.0, 0.05, 0.02], fov: 38 },
  { p: 0.06, pos: [0.3, 1.85, 1.5], look: [0.0, 0.05, 0.0], fov: 34 },
  { p: 0.13, pos: [0.55, 1.05, 2.0], look: [0.0, 0.55, 0.0], fov: 37, roll: -1.2 },
  { p: 0.22, pos: [0.0, 1.3, 2.95], look: [0.0, 1.14, 0.0], fov: 33 },
  { p: 0.275, pos: [0.0, 1.18, 2.35], look: [0.0, 1.15, 0.0], fov: 30 },
  { p: 0.34, pos: [0.0, 1.2, 3.0], look: [0.0, 1.16, 0.0], fov: 33 },
  { p: 0.46, pos: [0.35, 1.25, 2.7], look: [0.0, 1.16, 0.0], fov: 31, roll: 0.8 },
  // Trois-quarts un peu au-dessus : on lit les six plaques, pas un mur de verre.
  { p: 0.55, pos: [3.15, 2.18, 2.95], look: [0.05, 1.12, -1.35], fov: 32, roll: 0.6 },
  // On revient face au plateau : un seul sujet au centre, du backend à l'IA.
  { p: 0.61, pos: [0.0, 1.4, 3.45], look: [0.0, 1.2, -1.45], fov: 34 },
  { p: 0.66, pos: [0.0, 1.38, 3.35], look: [0.0, 1.18, -1.45], fov: 33 },
  // Données : 3/4 un peu au-dessus, pour lire la table et la pile de disques.
  { p: 0.73, pos: [1.55, 1.92, 2.65], look: [0.0, 1.08, -1.45], fov: 34 },
  { p: 0.79, pos: [0.0, 1.38, 3.25], look: [0.0, 1.22, -1.45], fov: 34 },
  // L'IA s'implose sur place, le noyau naît au même point, puis avance au centre.
  { p: 0.84, pos: [0.0, 1.4, 3.55], look: [0.0, 1.18, -1.45], fov: 35 },
  { p: 0.88, pos: [0.12, 1.48, 4.15], look: [0.0, 1.15, -0.35], fov: 36 },
  { p: 0.91, pos: [0.0, 1.5, 4.6], look: [0.0, 1.13, 0.0], fov: 38 },
  { p: 0.93, pos: [0.0, 3.5, 4.2], look: [0.0, 0.9, 0.0], fov: 42 },
  // La fin, réécrite : la caméra se pose avant que les écrans n'apparaissent,
  // puis recule doucement pour cadrer l'éventail et la constellation.
  { p: 0.958, pos: [0.0, 1.35, 3.3], look: [0.0, 1.25, 0.0], fov: 38 },
  { p: 1.0, pos: [0.0, 1.5, 4.6], look: [0.0, 1.38, 0.0], fov: 41 }
];

const KEYFRAMES = [
  ...PROLOGUE_KEYFRAMES,
  ...STORY_KEYFRAMES.map((frame) => ({ ...frame, p: PROLOGUE + frame.p * (1 - PROLOGUE) }))
];

const PARALLAX = 0.1;

/** Les cadrages ci-dessus sont réglés pour un écran large. */
const REFERENCE_ASPECT = 16 / 9;
const MAX_FOV = 58;
const DEG = Math.PI / 180;

/**
 * Sur un écran étroit, la même focale coupe le sujet sur les côtés. On répartit
 * la correction entre l'ouverture et le recul. En portrait, on ouvre surtout
 * la verticale et on évite de tasser la scène dans le haut du cadre : les
 * couches, le backend et la base doivent occuper haut et bas.
 */
function fitToViewport(aspect, fov, storyP) {
  const need = Math.max(1, REFERENCE_ASPECT / aspect);
  const amount = portraitAmount(aspect);
  const portrait = amount > 0;
  const share = Math.sqrt(need);
  const stack = storyP > 0.47 && storyP < 0.86;
  const maxFov = portrait ? (stack ? 44 : 56) : MAX_FOV;
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
    const frame = sampleKeyframes(KEYFRAMES, raw);
    const fit = fitToViewport(camera.aspect, frame.fov, storyP);
    experienceStore.portrait = fit.amount > 0.04;
    experienceStore.spreadY = 1 + fit.amount * 0.72;

    const parallax = experienceStore.tier === "mobile" ? 0 : PARALLAX;
    const px = experienceStore.pointer.x * parallax;
    const py = experienceStore.pointer.y * parallax * 0.5;
    const k = 1 - Math.pow(0.008, Math.min(delta, 0.05));

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

    look.current.x = lerp(look.current.x, targetX, k);
    look.current.y = lerp(look.current.y, targetY, k);
    look.current.z = lerp(look.current.z, targetZ, k);

    camera.position.x = lerp(camera.position.x, targetX + (posX + px - targetX) * fit.distance, k);
    camera.position.y = lerp(camera.position.y, targetY + (posY + py - targetY) * fit.distance, k);
    camera.position.z = lerp(camera.position.z, targetZ + (posZ - targetZ) * fit.distance, k);

    // La secousse de la détonation : un tremblement multi-fréquence appliqué
    // à la position avant le lookAt — la caméra vibre, le cadre reste tenu.
    const shake =
      smoothstep(BOOM.start, BOOM.start + 0.004, raw) * (1 - smoothstep(BOOM.peak + 0.006, BOOM.end, raw));
    if (shake > 0.001) {
      const t = clock.elapsedTime;
      const amp = shake * 0.34;
      camera.position.x += Math.sin(t * 39.0) * amp;
      camera.position.y += Math.cos(t * 47.0) * amp * 0.7;
      camera.position.z += Math.sin(t * 31.0 + 1.7) * amp * 0.5;
    }

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
