/** Point carré du logo original : periwinkle #6667ab. */
export const BRAND_DOT = "#6667ab";
export const BRAND_NAME = "MILYM";
export const BRAND_WORDMARK_URL = "/logos/milym-wordmark.png";

const FONT = '"Arial Narrow", "Helvetica Neue Condensed", "Arial Black", Arial, sans-serif';

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
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
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

function sampleFilledPixels(ctx, width, height) {
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const out = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 140) out.push([x, y]);
    }
  }
  return out;
}

/**
 * Six glyphes dans l'ordre d'écriture : M, I, L, Y, M, puis le carré violet.
 * Chaque glyphe est dessiné seul, pour que les particules n'en collent pas
 * un à l'autre.
 */
export function collectWordmarkGlyphs() {
  const fontSize = 152;
  const width = 920;
  const height = 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.font = `800 ${fontSize}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const letters = [...BRAND_NAME];
  const y = 168;
  let cursor = 48;
  const glyphs = [];

  letters.forEach((letter) => {
    const w = ctx.measureText(letter).width;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${fontSize}px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(letter, cursor, y);
    glyphs.push({ samples: sampleFilledPixels(ctx, width, height), isDot: false });
    cursor += w;
  });

  const square = fontSize * 0.23;
  const gap = fontSize * 0.14;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = BRAND_DOT;
  ctx.fillRect(cursor + gap, y - square, square, square);
  glyphs.push({ samples: sampleFilledPixels(ctx, width, height), isDot: true });

  return { glyphs, width, height };
}

function splitByXGaps(points, expected) {
  if (!points.length) return Array.from({ length: expected }, () => []);
  const columns = new Map();
  for (const point of points) {
    const x = point[0];
    const col = columns.get(x);
    if (col) col.push(point);
    else columns.set(x, [point]);
  }
  const xs = [...columns.keys()].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1];
    if (dx >= 4) gaps.push({ after: xs[i - 1], dx });
  }
  gaps.sort((a, b) => b.dx - a.dx);
  const cuts = gaps
    .slice(0, Math.max(0, expected - 1))
    .map((gap) => gap.after)
    .sort((a, b) => a - b);

  const groups = Array.from({ length: Math.max(1, cuts.length + 1) }, () => []);
  for (const point of points) {
    let index = cuts.findIndex((cut) => point[0] <= cut);
    if (index < 0) index = groups.length - 1;
    groups[index].push(point);
  }
  while (groups.length < expected) groups.push([]);
  return groups.slice(0, expected);
}

/** Découpe le wordmark officiel en M, I, L, Y, M, puis le carré. */
export function glyphsFromSamples(samples) {
  const letters = splitByXGaps(samples.letters, 5).map((pts) => ({ samples: pts, isDot: false }));
  letters.push({ samples: samples.dots.length ? samples.dots : [], isDot: true });
  return { glyphs: letters, width: samples.width, height: samples.height };
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
