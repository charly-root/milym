/** Point carré du logo original : periwinkle #6667ab. */
export const BRAND_DOT = "#6667ab";
export const BRAND_NAME = "MILYM";
export const BRAND_WORDMARK_URL = "/logos/milym-wordmark.png";

const FONT = '"Arial Narrow", Arial, "Helvetica Neue", sans-serif';

function layout(ctx, fontSize) {
  ctx.font = `700 ${fontSize}px ${FONT}`;
  const textW = ctx.measureText(BRAND_NAME).width;
  const square = fontSize * 0.23;
  const gap = fontSize * 0.14;
  return { textW, square, gap, total: textW + gap + square };
}

/**
 * Dessine « MILYM » suivi du carré violet, posé sur la ligne de base `y`.
 * `align` : "left" (x = bord gauche) ou "center" (x = milieu du bloc).
 */
export function drawWordmark(ctx, x, y, { fontSize = 72, color = "#ffffff", align = "left" } = {}) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const { textW, square, gap, total } = layout(ctx, fontSize);
  const ox = align === "center" ? x - total / 2 : x;
  ctx.fillStyle = color;
  ctx.fillText(BRAND_NAME, ox, y);
  ctx.fillStyle = BRAND_DOT;
  ctx.fillRect(ox + textW + gap, y - square, square, square);
  ctx.restore();
  return { x: ox, width: total, square };
}

function isDotPixel(r, g, b, a) {
  if (a < 128) return false;
  return r < 180 && b > 140 && Math.abs(r - g) < 45;
}

function isLetterPixel(r, g, b, a) {
  if (a < 128) return false;
  return r > 200 && g > 200 && b > 200;
}

/** Pixels lettres / carré, pour que les particules reproduisent le wordmark. */
export function collectWordmarkSamples(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const letters = [];
  const dots = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      if (isDotPixel(r, g, b, a)) dots.push([x, y]);
      else if (isLetterPixel(r, g, b, a)) letters.push([x, y]);
      else if (a > 128) letters.push([x, y]);
    }
  }
  return { letters, dots, width, height };
}

export function scatterWordmark(samples, count, mapPoint) {
  const positions = new Float32Array(count * 3);
  const marks = new Float32Array(count);
  const letterPool = samples.letters.length ? samples.letters : [[samples.width / 2, samples.height / 2]];
  const dotPool = samples.dots.length ? samples.dots : [];
  const dotCount = dotPool.length ? Math.min(count, Math.max(48, Math.floor(count * 0.09))) : 0;
  const isDot = new Uint8Array(count);
  for (let i = 0; i < dotCount; i++) isDot[i] = 1;
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = isDot[i];
    isDot[i] = isDot[j];
    isDot[j] = tmp;
  }

  for (let i = 0; i < count; i++) {
    const pool = isDot[i] ? dotPool : letterPool;
    const [sx, sy] = pool[Math.floor(Math.random() * pool.length)];
    const [x, y, z] = mapPoint(sx, sy, samples.width, samples.height);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    marks[i] = isDot[i];
  }
  return { positions, marks };
}

export function samplesFromImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return collectWordmarkSamples(canvas);
}

export function loadWordmarkImage() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = BRAND_WORDMARK_URL;
  });
}
