import * as THREE from "three";
import { BRAND_WORDMARK_URL, drawWordmark } from "../brand/wordmark.js";

const PAPER_W = 1024;
const PAPER_H = 1448; // proportions A4
const UI_W = 1024;
const UI_H = 576; // 16:9, comme l'écran

const INK = "rgba(38, 31, 26, ";
const PENCIL = "rgba(58, 48, 40, ";

function seeded(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function roundedPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRounded(ctx, x, y, w, h, r, color, width = 1.5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundedPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

/* ── Feuille de papier ─────────────────────────────────────────────────── */

function grain(ctx, width, height, amount, seed) {
  const rand = seeded(seed);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
}

/** Trait tremblé : une ligne tracée à main levée n'est jamais droite. */
function penLine(ctx, x1, y1, x2, y2, rand, jitter = 2.2) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const segments = Math.max(4, Math.round(length / 42));
  ctx.beginPath();
  ctx.moveTo(x1 + (rand() - 0.5) * jitter, y1 + (rand() - 0.5) * jitter);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    ctx.lineTo(
      x1 + (x2 - x1) * t + (rand() - 0.5) * jitter,
      y1 + (y2 - y1) * t + (rand() - 0.5) * jitter
    );
  }
  ctx.stroke();
}

function penRect(ctx, x, y, w, h, rand) {
  penLine(ctx, x, y, x + w, y, rand);
  penLine(ctx, x + w, y, x + w, y + h, rand);
  penLine(ctx, x + w, y + h, x, y + h, rand);
  penLine(ctx, x, y + h, x, y, rand);
}

function hand(ctx, text, x, y, size, color, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.font = `italic ${size}px Georgia, "Times New Roman", serif`;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Le wireframe griffonné. Sa composition suit exactement celle de l'interface
 * numérique (bandeau, titre, texte, bouton, deux blocs) : c'est ce qui rend la
 * transformation papier → écran lisible.
 */
export function createPaperTexture() {
  const { canvas, ctx } = makeCanvas(PAPER_W, PAPER_H);
  const rand = seeded(24);

  ctx.fillStyle = "#e9e1d4";
  ctx.fillRect(0, 0, PAPER_W, PAPER_H);

  const shade = ctx.createLinearGradient(0, 0, PAPER_W, PAPER_H);
  shade.addColorStop(0, "rgba(255, 252, 245, 0.5)");
  shade.addColorStop(1, "rgba(120, 104, 84, 0.16)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, PAPER_W, PAPER_H);
  grain(ctx, PAPER_W, PAPER_H, 14, 9);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `${INK}0.74)`;
  ctx.lineWidth = 2.4;

  // Bandeau : logo + navigation
  penRect(ctx, 118, 150, 788, 96, rand);
  ctx.beginPath();
  ctx.arc(172, 198, 26, 0, Math.PI * 2);
  ctx.stroke();
  penLine(ctx, 620, 198, 700, 198, rand);
  penLine(ctx, 730, 198, 810, 198, rand);
  penLine(ctx, 840, 198, 890, 198, rand);

  // Titre + texte
  hand(ctx, "TITRE", 130, 400, 62, `${INK}0.8)`, -0.012);
  penLine(ctx, 130, 452, 720, 456, rand, 1.8);
  penLine(ctx, 130, 492, 620, 495, rand, 1.8);
  penLine(ctx, 130, 532, 668, 536, rand, 1.8);

  // Bouton
  penRect(ctx, 130, 592, 246, 84, rand);
  hand(ctx, "BOUTON", 168, 646, 30, `${INK}0.7)`);

  // Deux blocs du bas
  penRect(ctx, 118, 800, 380, 300, rand);
  penLine(ctx, 118, 800, 498, 1100, rand, 2.6);
  penLine(ctx, 498, 800, 118, 1100, rand, 2.6);
  hand(ctx, "IMAGE", 232, 1160, 34, `${INK}0.5)`);

  penRect(ctx, 528, 800, 380, 300, rand);
  penLine(ctx, 560, 860, 878, 864, rand, 1.8);
  penLine(ctx, 560, 906, 840, 910, rand, 1.8);
  penLine(ctx, 560, 952, 862, 956, rand, 1.8);
  penLine(ctx, 560, 998, 800, 1002, rand, 1.8);
  hand(ctx, "TEXTE", 656, 1160, 34, `${INK}0.5)`);

  return toTexture(canvas);
}

/**
 * Les annotations vivent sur leur propre calque : elles s'effacent avant le
 * reste quand le croquis devient numérique.
 */
export function createAnnotationTexture() {
  const { canvas, ctx } = makeCanvas(PAPER_W, PAPER_H);
  const rand = seeded(77);
  ctx.lineCap = "round";
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = `${PENCIL}0.5)`;

  hand(ctx, "idée", 44, 300, 34, `${PENCIL}0.55)`, -0.34);
  hand(ctx, "site ?", 40, 980, 30, `${PENCIL}0.48)`, -0.18);
  hand(ctx, "app ?", 916, 330, 30, `${PENCIL}0.46)`, 0.2);
  hand(ctx, "aide ?", 928, 1010, 32, `${PENCIL}0.44)`, 0.16);
  hand(ctx, "lien", 44, 1268, 30, `${PENCIL}0.42)`, -0.06);
  hand(ctx, "dashboard", 700, 1268, 30, `${PENCIL}0.42)`, 0.05);
  hand(ctx, "header", 470, 132, 26, `${PENCIL}0.42)`, -0.02);
  hand(ctx, "logo ?", 214, 208, 26, `${PENCIL}0.5)`, -0.04);
  hand(ctx, "CTA", 404, 652, 26, `${PENCIL}0.46)`, 0.09);
  hand(ctx, "contact", 118, 1352, 26, `${PENCIL}0.38)`, -0.1);

  // Le bouton est entouré : c'est l'idée qu'on veut garder
  ctx.beginPath();
  ctx.ellipse(258, 636, 168, 74, -0.06, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(122, 62, 46, 0.5)";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Flèche entre le bouton et le bloc image
  ctx.strokeStyle = `${PENCIL}0.5)`;
  ctx.beginPath();
  ctx.moveTo(300, 716);
  ctx.quadraticCurveTo(360, 762, 300, 812);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(288, 790);
  ctx.lineTo(300, 814);
  ctx.lineTo(316, 794);
  ctx.stroke();

  // Une correction : un mot rayé
  hand(ctx, "urgent", 706, 700, 30, `${PENCIL}0.4)`, -0.07);
  ctx.strokeStyle = "rgba(122, 62, 46, 0.55)";
  ctx.beginPath();
  ctx.moveTo(700, 690);
  ctx.lineTo(806, 700);
  ctx.stroke();
  hand(ctx, "v2", 820, 706, 26, `${PENCIL}0.4)`, 0.08);

  return toTexture(canvas);
}

/** « MILYM » et la phrase d'ouverture, écrits au centre de la feuille. */
export function createPaperTitleTexture() {
  const { canvas, ctx } = makeCanvas(PAPER_W, PAPER_H);
  drawWordmark(ctx, PAPER_W / 2, 1300, {
    fontSize: 92,
    color: "rgba(38, 31, 26, 0.82)",
    align: "center"
  });
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(38, 31, 26, 0.5)";
  ctx.font = 'italic 38px Georgia, "Times New Roman", serif';
  ctx.fillText("Tout commence par une idée.", PAPER_W / 2, 1364);
  return toTexture(canvas);
}

/* ── Interfaces ────────────────────────────────────────────────────────── */

/** Le prototype : blocs gris, textes génériques, rien n'est fini. */
export function createWireframeUITexture() {
  const { canvas, ctx } = makeCanvas(UI_W, UI_H);
  ctx.fillStyle = "#121218";
  ctx.fillRect(0, 0, UI_W, UI_H);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1;
  for (let x = 0; x < UI_W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, UI_H);
    ctx.stroke();
  }

  const grey = "rgba(148, 163, 184, 0.22)";
  const greyStrong = "rgba(148, 163, 184, 0.4)";

  fillRounded(ctx, 56, 34, 912, 58, 10, grey);
  fillRounded(ctx, 74, 48, 30, 30, 8, greyStrong);
  fillRounded(ctx, 640, 54, 70, 18, 6, greyStrong);
  fillRounded(ctx, 726, 54, 70, 18, 6, greyStrong);
  fillRounded(ctx, 812, 48, 138, 30, 8, greyStrong);

  fillRounded(ctx, 66, 140, 420, 34, 6, greyStrong);
  fillRounded(ctx, 66, 192, 330, 14, 4, grey);
  fillRounded(ctx, 66, 218, 372, 14, 4, grey);
  fillRounded(ctx, 66, 262, 180, 44, 8, greyStrong);

  fillRounded(ctx, 56, 350, 440, 186, 12, grey);
  fillRounded(ctx, 528, 350, 440, 186, 12, grey);
  ctx.strokeStyle = greyStrong;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 350);
  ctx.lineTo(496, 536);
  ctx.moveTo(496, 350);
  ctx.lineTo(56, 536);
  ctx.stroke();
  fillRounded(ctx, 556, 386, 300, 16, 4, greyStrong);
  fillRounded(ctx, 556, 418, 260, 16, 4, greyStrong);
  fillRounded(ctx, 556, 450, 284, 16, 4, greyStrong);

  ctx.fillStyle = "rgba(196, 181, 253, 0.55)";
  ctx.font = "500 20px Inter, system-ui, sans-serif";
  ctx.fillText("Prototype", 66, 116);

  return toTexture(canvas);
}

/** Le site terminé, tel qu'il apparaît à la fin du récit. */
export function createFinalUITexture() {
  const { canvas, ctx } = makeCanvas(UI_W, UI_H);

  const bg = ctx.createLinearGradient(0, 0, UI_W, UI_H);
  bg.addColorStop(0, "#0d0716");
  bg.addColorStop(0.55, "#0a0a10");
  bg.addColorStop(1, "#120a20");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, UI_W, UI_H);

  const halo = ctx.createRadialGradient(300, 150, 20, 300, 200, 520);
  halo.addColorStop(0, "rgba(124, 58, 237, 0.28)");
  halo.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, UI_W, UI_H);

  // Bandeau
  fillRounded(ctx, 56, 34, 912, 58, 14, "rgba(255, 255, 255, 0.04)");
  strokeRounded(ctx, 56, 34, 912, 58, 14, "rgba(168, 85, 247, 0.22)");
  drawWordmark(ctx, 76, 72, { fontSize: 22, color: "rgba(245, 243, 255, 0.95)" });
  ctx.fillStyle = "rgba(196, 181, 253, 0.66)";
  ctx.font = "500 15px Inter, system-ui, sans-serif";
  ctx.fillText("Accueil", 632, 69);
  ctx.fillText("Projets", 712, 69);
  ctx.fillText("Contact", 790, 69);
  fillRounded(ctx, 866, 46, 86, 34, 10, "rgba(124, 58, 237, 0.9)");

  // Hero
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "700 44px Inter, system-ui, sans-serif";
  ctx.fillText("Créateur de projets", 66, 178);
  ctx.fillStyle = "rgba(161, 161, 170, 0.92)";
  ctx.font = "400 18px Inter, system-ui, sans-serif";
  ctx.fillText("Une idée devient un produit numérique complet.", 66, 214);
  fillRounded(ctx, 66, 246, 196, 46, 12, "rgba(124, 58, 237, 0.95)");
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 15px Inter, system-ui, sans-serif";
  ctx.fillText("Créer mon projet", 96, 275);

  // Deux cartes
  fillRounded(ctx, 56, 350, 440, 186, 16, "rgba(124, 58, 237, 0.14)");
  strokeRounded(ctx, 56, 350, 440, 186, 16, "rgba(168, 85, 247, 0.3)");
  fillRounded(ctx, 76, 368, 400, 100, 10, "rgba(168, 85, 247, 0.22)");
  ctx.fillStyle = "rgba(233, 213, 255, 0.95)";
  ctx.font = "600 17px Inter, system-ui, sans-serif";
  ctx.fillText("Nébula Dashboard", 76, 498);
  ctx.fillStyle = "rgba(161, 161, 170, 0.85)";
  ctx.font = "400 13px Inter, system-ui, sans-serif";
  ctx.fillText("Application · tableau de bord", 76, 520);

  fillRounded(ctx, 528, 350, 440, 186, 16, "rgba(124, 58, 237, 0.14)");
  strokeRounded(ctx, 528, 350, 440, 186, 16, "rgba(168, 85, 247, 0.3)");
  ctx.fillStyle = "rgba(233, 213, 255, 0.95)";
  ctx.font = "600 17px Inter, system-ui, sans-serif";
  ctx.fillText("Sentinelle IA", 552, 390);
  ctx.fillStyle = "rgba(161, 161, 170, 0.85)";
  ctx.font = "400 13px Inter, system-ui, sans-serif";
  ctx.fillText("Assistant de veille intelligent", 552, 416);
  fillRounded(ctx, 552, 436, 392, 10, 5, "rgba(168, 85, 247, 0.35)");
  fillRounded(ctx, 552, 458, 330, 10, 5, "rgba(168, 85, 247, 0.25)");
  fillRounded(ctx, 552, 480, 366, 10, 5, "rgba(168, 85, 247, 0.2)");

  return toTexture(canvas);
}

/* ── Étiquettes ────────────────────────────────────────────────────────── */

/** Étiquette d'une couche : texte aligné à gauche, comme une légende technique. */
export function createTagTexture(title, subtitle) {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = "rgba(196, 181, 253, 0.95)";
  ctx.beginPath();
  ctx.arc(14, 44, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  ctx.fillText(title, 34, 58);

  if (subtitle) {
    ctx.fillStyle = "rgba(161, 161, 170, 0.9)";
    ctx.font = "400 26px Inter, system-ui, sans-serif";
    ctx.fillText(subtitle, 34, 96);
  }

  return toTexture(canvas);
}

/**
 * Légende lisible sur fond noir : pastille colorée, titre, sous-titre, le tout
 * sur une plaque sombre. Sans ce fond, le texte disparaissait dans la scène.
 */
export function createCaptionTexture(title, subtitle, accent = "#a78bfa") {
  const { canvas, ctx } = makeCanvas(768, 176);
  fillRounded(ctx, 16, 18, 736, 140, 28, "rgba(7, 5, 14, 0.88)");
  strokeRounded(ctx, 16, 18, 736, 140, 28, `${accent}99`, 2.5);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(56, 88, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8f5ff";
  ctx.font = "600 52px Inter, system-ui, sans-serif";
  ctx.fillText(title, 86, 82);

  if (subtitle) {
    ctx.fillStyle = "rgba(196, 181, 253, 0.88)";
    ctx.font = "400 28px Inter, system-ui, sans-serif";
    ctx.fillText(subtitle, 86, 122);
  }

  return toTexture(canvas);
}

function plateChrome(ctx, w, h, accent, index, title, subtitle) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#120a1c");
  bg.addColorStop(1, "#07060d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.22, h * 0.2, 10, w * 0.3, h * 0.35, w * 0.7);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  fillRounded(ctx, 0, 0, w, 8, 0, accent);
  ctx.fillStyle = `${accent}cc`;
  ctx.font = "700 64px Inter, system-ui, sans-serif";
  ctx.fillText(String(index).padStart(2, "0"), 36, 92);

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 48px Inter, system-ui, sans-serif";
  ctx.fillText(title, 36, 150);
  ctx.fillStyle = "rgba(196, 181, 253, 0.8)";
  ctx.font = "400 24px Inter, system-ui, sans-serif";
  ctx.fillText(subtitle, 36, 186);
}

function drawUiMini(ctx, x, y, w, h, accent) {
  fillRounded(ctx, x, y, w, h, 14, "rgba(255,255,255,0.04)");
  strokeRounded(ctx, x, y, w, h, 14, `${accent}66`, 1.6);
  fillRounded(ctx, x + 12, y + 12, w - 24, 22, 8, "rgba(255,255,255,0.07)");
  fillRounded(ctx, x + 12, y + 48, w * 0.55, 14, 5, `${accent}88`);
  fillRounded(ctx, x + 12, y + 72, w * 0.4, 10, 4, "rgba(255,255,255,0.12)");
  fillRounded(ctx, x + 12, y + 98, w * 0.28, 22, 8, accent);
  fillRounded(ctx, x + 12, y + h - 52, (w - 36) / 2, 40, 10, `${accent}33`);
  fillRounded(ctx, x + w / 2 + 6, y + h - 52, (w - 36) / 2, 40, 10, `${accent}22`);
}

function drawReactMini(ctx, x, y, w, h, accent) {
  const boxes = [
    [0, 0, 1, 0.22],
    [0.04, 0.3, 0.44, 0.62],
    [0.52, 0.3, 0.44, 0.28],
    [0.52, 0.64, 0.44, 0.28]
  ];
  boxes.forEach(([dx, dy, dw, dh], i) => {
    fillRounded(ctx, x + dx * w, y + dy * h, dw * w, dh * h, 10, i === 0 ? `${accent}44` : "rgba(255,255,255,0.05)");
    strokeRounded(ctx, x + dx * w, y + dy * h, dw * w, dh * h, 10, `${accent}77`, 1.5);
  });
}

function drawLogicMini(ctx, x, y, w, h, accent) {
  const nodes = [
    [0.18, 0.28],
    [0.5, 0.22],
    [0.82, 0.32],
    [0.34, 0.72],
    [0.68, 0.7]
  ];
  ctx.strokeStyle = `${accent}77`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + nodes[0][0] * w, y + nodes[0][1] * h);
  nodes.slice(1).forEach(([nx, ny]) => ctx.lineTo(x + nx * w, y + ny * h));
  ctx.stroke();
  nodes.forEach(([nx, ny], i) => {
    ctx.fillStyle = i === 1 ? accent : `${accent}99`;
    ctx.beginPath();
    ctx.arc(x + nx * w, y + ny * h, 11, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawApiMini(ctx, x, y, w, h, accent) {
  ["Demande", "Réponse", "Écoute"].forEach((line, i) => {
    fillRounded(ctx, x, y + i * (h / 3 + 4), w, h / 3 - 4, 10, "rgba(255,255,255,0.04)");
    strokeRounded(ctx, x, y + i * (h / 3 + 4), w, h / 3 - 4, 10, `${accent}55`, 1.4);
    ctx.fillStyle = accent;
    ctx.font = "600 22px Inter, system-ui, sans-serif";
    ctx.fillText(line, x + 18, y + i * (h / 3 + 4) + h / 6 + 4);
  });
}

function drawNodeMini(ctx, x, y, w, h, accent) {
  for (let i = 0; i < 4; i++) {
    fillRounded(ctx, x, y + i * 36, w, 28, 8, i === 1 ? `${accent}33` : "rgba(255,255,255,0.04)");
    ctx.fillStyle = i === 1 ? accent : `${accent}88`;
    ctx.beginPath();
    ctx.arc(x + 22, y + i * 36 + 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(245,243,255,0.8)";
    ctx.font = "500 16px Inter, system-ui, sans-serif";
    ctx.fillText(i === 1 ? "en marche" : `veille  ${i + 1}`, x + 40, y + i * 36 + 19);
  }
}

function drawDatabaseMini(ctx, x, y, w, h, accent) {
  ctx.fillStyle = `${accent}22`;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 22, w * 0.38, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${accent}aa`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = `${accent}18`;
  ctx.fillRect(x + w * 0.12, y + 22, w * 0.76, h * 0.55);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 22 + h * 0.55, w * 0.38, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 22, w * 0.38, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    fillRounded(ctx, x + w * 0.22, y + 48 + i * 22, w * 0.56, 10, 4, `${accent}55`);
  }
}

const LAYER_DRAWERS = {
  ui: drawUiMini,
  react: drawReactMini,
  logic: drawLogicMini,
  api: drawApiMini,
  node: drawNodeMini,
  database: drawDatabaseMini
};

/** Face d'une plaque de la vue éclatée : on lit le rôle, pas un verre vide. */
export function createLayerPlateTexture(layer) {
  const w = 768;
  const h = 432;
  const { canvas, ctx } = makeCanvas(w, h);
  plateChrome(ctx, w, h, layer.accent, layer.index, layer.title, layer.sub);
  const drawer = LAYER_DRAWERS[layer.id];
  if (drawer) drawer(ctx, 36, 214, w - 72, 180, layer.accent);
  return toTexture(canvas);
}

/** Étiquette centrée, pour les modules qui gravitent autour du noyau. */
export function createChipTexture(label) {
  const { canvas, ctx } = makeCanvas(320, 96);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 40px Inter, system-ui, sans-serif";
  ctx.fillText(label, 160, 62);
  return toTexture(canvas);
}

/**
 * Le logo, redessiné dans un canvas carré. Un SVG sans largeur ni hauteur
 * intrinsèques n'a pas de dimensions exploitables par WebGL : le passer par un
 * canvas garantit une texture valide quel que soit le fichier téléversé.
 */
export function loadBadgeTexture(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const size = 256;
      const { canvas, ctx } = makeCanvas(size, size);
      const width = image.naturalWidth || size;
      const height = image.naturalHeight || size;
      const scale = Math.min(size / width, size / height);
      const w = width * scale;
      const h = height * scale;
      ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
      resolve(toTexture(canvas));
    };
    image.onerror = reject;
    image.src = url;
  });
}

/** Wordmark officiel, sans letterbox : le noyau l'affiche dans son vrai ratio. */
export function loadWordmarkTexture(url = BRAND_WORDMARK_URL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const width = image.naturalWidth || 699;
      const height = image.naturalHeight || 184;
      const { canvas, ctx } = makeCanvas(width, height);
      ctx.drawImage(image, 0, 0);
      resolve({ texture: toTexture(canvas), aspect: width / height });
    };
    image.onerror = reject;
    image.src = url;
  });
}

/* ── Écrans de l'écosystème et du produit final ────────────────────────── */

function browserChrome(ctx, w, title) {
  fillRounded(ctx, 0, 0, w, 40, 0, "#16161f");
  const dots = ["#f87171", "#fbbf24", "#34d399"];
  dots.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(22 + i * 20, 20, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(245, 243, 255, 0.65)";
  ctx.font = "500 14px Inter, system-ui, sans-serif";
  ctx.fillText(title, 96, 25);
}

export function createSiteTexture() {
  const { canvas, ctx } = makeCanvas(768, 456);
  const inner = createFinalUITexture();
  ctx.drawImage(inner.image, 0, 40, 768, 416);
  inner.dispose();
  browserChrome(ctx, 768, "milym.fr");
  return toTexture(canvas);
}

export function createDashboardTexture() {
  const { canvas, ctx } = makeCanvas(768, 456);
  ctx.fillStyle = "#0a0a10";
  ctx.fillRect(0, 0, 768, 456);
  browserChrome(ctx, 768, "app.milym / dashboard");

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText("Pilotage", 32, 96);

  ["Revenus", "Demandes", "Automatisations"].forEach((label, i) => {
    const x = 32 + i * 236;
    fillRounded(ctx, x, 120, 212, 96, 12, "rgba(124, 58, 237, 0.16)");
    ctx.fillStyle = "rgba(196, 181, 253, 0.9)";
    ctx.font = "500 14px Inter, system-ui, sans-serif";
    ctx.fillText(label, x + 18, 150);
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.fillText(["12 480 €", "1,2 M", "34"][i], x + 18, 190);
  });

  ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = 32 + (i / 24) * 704;
    const y = 400 - Math.sin(i * 0.55) * 46 - i * 2.2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  return toTexture(canvas);
}

export function createPhoneTexture() {
  const { canvas, ctx } = makeCanvas(360, 720);
  ctx.fillStyle = "#08080d";
  ctx.fillRect(0, 0, 360, 720);
  fillRounded(ctx, 130, 18, 100, 14, 7, "#1a1a24");

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText("Application", 26, 84);
  ctx.fillStyle = "rgba(161, 161, 170, 0.85)";
  ctx.font = "400 14px Inter, system-ui, sans-serif";
  ctx.fillText("Toujours à portée de main", 26, 110);

  ["Aujourd'hui", "3 tâches automatisées", "Synchronisé"].forEach((label, i) => {
    fillRounded(ctx, 22, 140 + i * 128, 316, 108, 18, "rgba(124, 58, 237, 0.16)");
    ctx.fillStyle = "rgba(233, 213, 255, 0.95)";
    ctx.font = "600 18px Inter, system-ui, sans-serif";
    ctx.fillText(label, 44, 196 + i * 128);
  });

  fillRounded(ctx, 22, 552, 316, 54, 14, "rgba(124, 58, 237, 0.92)");
  ctx.fillStyle = "#fff";
  ctx.font = "600 16px Inter, system-ui, sans-serif";
  ctx.fillText("Ouvrir le flux", 122, 586);

  return toTexture(canvas);
}

export function createAiPanelTexture() {
  const { canvas, ctx } = makeCanvas(640, 400);
  ctx.fillStyle = "#08060e";
  ctx.fillRect(0, 0, 640, 400);
  browserChrome(ctx, 640, "ia.milym");

  ctx.fillStyle = "#ddd6fe";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText("Système intelligent", 28, 86);

  const nodes = [];
  for (let i = 0; i < 10; i++) {
    nodes.push([90 + (i % 5) * 116, 160 + Math.floor(i / 5) * 110]);
  }
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 1.4;
  nodes.forEach(([x, y], i) => {
    nodes.slice(i + 1).forEach(([x2, y2]) => {
      if (Math.hypot(x2 - x, y2 - y) < 150) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });
  });
  nodes.forEach(([x, y], i) => {
    ctx.fillStyle = i % 3 === 0 ? "rgba(221, 214, 254, 0.95)" : "rgba(168, 85, 247, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  return toTexture(canvas);
}

export function createAutomationTexture() {
  const { canvas, ctx } = makeCanvas(640, 400);
  ctx.fillStyle = "#0a0a10";
  ctx.fillRect(0, 0, 640, 400);
  browserChrome(ctx, 640, "outil.milym");

  ctx.fillStyle = "#c084fc";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText("Automatisation", 28, 88);

  ["Signal", "Suite", "Lien", "Action"].forEach((step, i) => {
    const x = 28 + i * 150;
    fillRounded(ctx, x, 150, 126, 76, 12, "rgba(124, 58, 237, 0.2)");
    strokeRounded(ctx, x, 150, 126, 76, 12, "rgba(168, 85, 247, 0.4)");
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.fillText(step, x + 20, 194);
    if (i < 3) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 126, 188);
      ctx.lineTo(x + 148, 188);
      ctx.stroke();
    }
  });

  return toTexture(canvas);
}

export function createDataPanelTexture() {
  const { canvas, ctx } = makeCanvas(640, 400);
  ctx.fillStyle = "#0a0810";
  ctx.fillRect(0, 0, 640, 400);
  browserChrome(ctx, 640, "data.milym");

  ctx.fillStyle = "#ddd6fe";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText("Base de données", 28, 86);

  for (let row = 0; row < 6; row++) {
    fillRounded(ctx, 28, 116 + row * 44, 584, 32, 8, row % 2 ? "rgba(124, 58, 237, 0.1)" : "rgba(124, 58, 237, 0.18)");
    ctx.fillStyle = "rgba(196, 181, 253, 0.7)";
    ctx.font = "400 14px Inter, system-ui, sans-serif";
    ctx.fillText(`id_${1024 + row}`, 44, 138 + row * 44);
    ctx.fillText("• • • •", 260, 138 + row * 44);
    ctx.fillText("ok", 540, 138 + row * 44);
  }

  return toTexture(canvas);
}
