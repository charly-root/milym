import { STAGE } from "../stage.js";
import { collectWordmarkSamples, drawWordmark, scatterWordmark } from "../brand/wordmark.js";

/**
 * Les dix formes que la nappe de particules traverse pendant le récit.
 * Chaque générateur remplit un Float32Array de positions monde : le shader ne
 * fait ensuite qu'interpoler entre la forme quittée et la forme visée.
 */

const CX = STAGE.center[0];
const CY = STAGE.center[1];
const CZ = STAGE.center[2];
const SW = STAGE.screen.width;
const SH = STAGE.screen.height;

/** Bruit centré, plus dense au milieu qu'aux bords (somme de trois tirages). */
function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

/** Poussière en suspension au-dessus du bureau : la scène de nuit. */
export function dust(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = gauss() * 2.6;
    out[i * 3 + 1] = 0.05 + Math.random() * 3.1;
    out[i * 3 + 2] = gauss() * 2.2;
  }
  return out;
}

/** Tourbillon hélicoïdal autour de la feuille qui se redresse : l'idée s'agite. */
export function vortex(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const angle = t * Math.PI * 6 + gauss() * 0.4;
    const radius = 0.35 + (1 - t) * 0.7 + Math.abs(gauss()) * 0.2;
    out[i * 3] = Math.cos(angle) * radius;
    out[i * 3 + 1] = 0.12 + t * 1.85 + gauss() * 0.06;
    out[i * 3 + 2] = 0.05 + Math.sin(angle) * radius;
  }
  return out;
}

/** Grille de lignes sur le plan de l'écran : la feuille devient numérique. */
export function grid(count) {
  const out = new Float32Array(count * 3);
  const cols = 13;
  const rows = 8;
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    if (Math.random() < 0.5) {
      x = (Math.floor(Math.random() * cols) / (cols - 1) - 0.5) * SW;
      y = (Math.random() - 0.5) * SH;
    } else {
      x = (Math.random() - 0.5) * SW;
      y = (Math.floor(Math.random() * rows) / (rows - 1) - 0.5) * SH;
    }
    out[i * 3] = CX + x + gauss() * 0.008;
    out[i * 3 + 1] = CY + y + gauss() * 0.008;
    out[i * 3 + 2] = CZ + 0.01 + gauss() * 0.02;
  }
  return out;
}

/** Halo derrière l'écran fini : la lumière recule, l'interface est la star. */
export function halo(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.45) {
      // Liseré serré autour du cadre de l'écran.
      const border = Math.random() * 2 * (SW + SH);
      let x;
      let y;
      if (border < SW) [x, y] = [border - SW / 2, -SH / 2];
      else if (border < SW * 2) [x, y] = [border - SW * 1.5, SH / 2];
      else if (border < SW * 2 + SH) [x, y] = [-SW / 2, border - SW * 2 - SH / 2];
      else [x, y] = [SW / 2, border - SW * 2 - SH * 1.5];
      out[i * 3] = CX + x + gauss() * 0.03;
      out[i * 3 + 1] = CY + y + gauss() * 0.03;
      out[i * 3 + 2] = CZ + 0.02 + gauss() * 0.02;
    } else {
      // Aurore elliptique diffuse derrière la dalle.
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.75 + Math.abs(gauss()) * 0.5;
      out[i * 3] = CX + Math.cos(angle) * radius * 1.45;
      out[i * 3 + 1] = CY + Math.sin(angle) * radius * 0.8;
      out[i * 3 + 2] = CZ - 0.35 - Math.random() * 0.5;
    }
  }
  return out;
}

/** Les six plaques de la vue éclatée, arêtes, faces et colonnes de liaison. */
export function layers(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(Math.random() * STAGE.layerCount);
    const z = CZ - layer * STAGE.layerGap;
    const roll = Math.random();
    let x;
    let y;
    if (roll < 0.55) {
      const border = Math.random() * 2 * (SW + SH);
      if (border < SW) [x, y] = [border - SW / 2, -SH / 2];
      else if (border < SW * 2) [x, y] = [border - SW * 1.5, SH / 2];
      else if (border < SW * 2 + SH) [x, y] = [-SW / 2, border - SW * 2 - SH / 2];
      else [x, y] = [SW / 2, border - SW * 2 - SH * 1.5];
      out[i * 3] = CX + x + gauss() * 0.012;
      out[i * 3 + 1] = CY + y + gauss() * 0.012;
      out[i * 3 + 2] = z + gauss() * 0.015;
    } else if (roll < 0.78) {
      x = (Math.random() - 0.5) * SW;
      y = (Math.random() - 0.5) * SH;
      out[i * 3] = CX + x + gauss() * 0.01;
      out[i * 3 + 1] = CY + y + gauss() * 0.01;
      out[i * 3 + 2] = z + gauss() * 0.012;
    } else {
      const along = Math.random();
      out[i * 3] = CX + ((i % 4) - 1.5) * 0.42;
      out[i * 3 + 1] = CY + ((i % 3) - 1) * 0.28;
      out[i * 3 + 2] = CZ - along * (STAGE.layerCount - 1) * STAGE.layerGap;
    }
  }
  return out;
}

/** Trois baies serveur, plus le bus qui les relie. */
export function servers(count) {
  const out = new Float32Array(count * 3);
  const boxes = [
    [-1.12, 0.43, 0.25, 0.28],
    [0, 0.43, 0.25, 0.28],
    [1.12, 0.43, 0.25, 0.28]
  ];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (roll < 0.72) {
      const box = boxes[i % 3];
      out[i * 3] = CX + box[0] + gauss() * box[1];
      out[i * 3 + 1] = CY + gauss() * box[2];
      out[i * 3 + 2] = STAGE.backendZ + gauss() * box[3];
    } else {
      const t = Math.random();
      out[i * 3] = CX - 1.12 + t * 2.24;
      out[i * 3 + 1] = CY + gauss() * 0.05;
      out[i * 3 + 2] = STAGE.backendZ + gauss() * 0.04;
    }
  }
  return out;
}

/** Grille de table à gauche, anneaux de disques à droite. */
export function database(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.42) {
      const col = Math.floor(Math.random() * 3);
      const row = Math.floor(Math.random() * 5);
      out[i * 3] = CX - 1.2 + col * 0.24 + gauss() * 0.04;
      out[i * 3 + 1] = CY + 0.32 - row * 0.18 + gauss() * 0.03;
      out[i * 3 + 2] = STAGE.databaseZ + 0.12 + gauss() * 0.03;
    } else {
      const platter = Math.floor(Math.random() * 5);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.32 + platter * 0.05 + Math.abs(gauss()) * 0.04;
      out[i * 3] = CX + 0.7 + Math.cos(angle) * radius;
      out[i * 3 + 1] = CY - 0.42 + platter * 0.21 + gauss() * 0.02;
      out[i * 3 + 2] = STAGE.databaseZ + Math.sin(angle) * radius;
    }
  }
  return out;
}

/** Deux rubans de données qui filent de l'écran vers la salle des machines. */
export function streams(count) {
  const out = new Float32Array(count * 3);
  const from = [CX, CY, CZ - 0.1];
  const to = [CX, CY - 0.12, STAGE.databaseZ + 0.2];
  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const swing = side * (0.12 + Math.random() * 0.18);
    const t = Math.random();
    // Bézier quadratique : départ à l'écran, détour latéral, arrivée aux données.
    const mid = [from[0] + swing, CY + 0.1 + Math.random() * 0.25, (from[2] + to[2]) / 2];
    const a = 1 - t;
    out[i * 3] = a * a * from[0] + 2 * a * t * mid[0] + t * t * to[0] + gauss() * 0.05;
    out[i * 3 + 1] = a * a * from[1] + 2 * a * t * mid[1] + t * t * to[1] + gauss() * 0.05;
    out[i * 3 + 2] = a * a * from[2] + 2 * a * t * mid[2] + t * t * to[2] + gauss() * 0.05;
  }
  return out;
}

/** Sphère neuronale autour du réseau IA, au centre de la scène. */
export function neural(count) {
  const out = new Float32Array(count * 3);
  const home = [CX, CY + 0.08, STAGE.aiZ];
  for (let i = 0; i < count; i++) {
    const shell = Math.random() < 0.82;
    const radius = shell ? 1.04 + gauss() * 0.035 : Math.random() * 0.5;
    const theta = Math.random() * Math.PI * 2;
    const y = Math.random() * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    out[i * 3] = home[0] + Math.cos(theta) * ring * radius;
    out[i * 3 + 1] = home[1] + y * radius;
    out[i * 3 + 2] = home[2] + Math.sin(theta) * ring * radius;
  }
  return out;
}

/** Coquille dense autour du noyau, plus un anneau équatorial. */
export function core(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (roll < 0.62) {
      const radius = 0.5 + gauss() * 0.04;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 2 - 1;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      out[i * 3] = CX + Math.cos(theta) * ring * radius;
      out[i * 3 + 1] = CY + y * radius;
      out[i * 3 + 2] = CZ + Math.sin(theta) * ring * radius;
    } else if (roll < 0.9) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.12 + gauss() * 0.05;
      out[i * 3] = CX + Math.cos(angle) * radius;
      out[i * 3 + 1] = CY + Math.sin(angle) * 0.16 + gauss() * 0.03;
      out[i * 3 + 2] = CZ + Math.sin(angle) * radius;
    } else {
      out[i * 3] = CX + gauss() * 0.2;
      out[i * 3 + 1] = CY + gauss() * 0.2;
      out[i * 3 + 2] = CZ + gauss() * 0.2;
    }
  }
  return out;
}

/** Galaxie spirale à trois bras : l'écosystème gravite. */
export function galaxy(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const arm = Math.floor(Math.random() * 3);
    const radius = Math.pow(Math.random(), 0.62) * 2.7;
    const angle = (arm / 3) * Math.PI * 2 + radius * 1.7 + gauss() * (0.16 + radius * 0.06);
    out[i * 3] = CX + Math.cos(angle) * radius;
    out[i * 3 + 1] = CY - 0.15 + gauss() * 0.07 * (1.8 - radius * 0.45);
    out[i * 3 + 2] = CZ + Math.sin(angle) * radius;
  }
  return out;
}

function mapLogoPoint(sx, sy, canvasW, canvasH) {
  const width = 2.55;
  const height = (width * canvasH) / canvasW;
  return [
    CX + (sx / canvasW - 0.5) * width + gauss() * 0.008,
    CY + 1.12 - (sy / canvasH - 0.5) * height + gauss() * 0.008,
    CZ - 0.3 + gauss() * 0.02
  ];
}

/** Constellation finale : MILYM + le carré violet du logo. */
export function logo(count, image) {
  let samples;
  if (image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    samples = collectWordmarkSamples(canvas);
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    drawWordmark(ctx, 360, 124, { fontSize: 108, align: "center" });
    samples = collectWordmarkSamples(canvas);
  }
  return scatterWordmark(samples, count, mapLogoPoint);
}
