import * as THREE from "three";

function seeded(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function grain(ctx, width, height, amount, seed = 1) {
  const rand = seeded(seed);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(image, 0, 0);
}

function wobbleLine(ctx, x1, y1, x2, y2, segs = 10, jitter = 2.4, rand = Math.random) {
  ctx.beginPath();
  ctx.moveTo(x1 + (rand() - 0.5), y1 + (rand() - 0.5));
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    ctx.lineTo(
      x1 + (x2 - x1) * t + (rand() - 0.5) * jitter,
      y1 + (y2 - y1) * t + (rand() - 0.5) * jitter
    );
  }
  ctx.stroke();
}

function wobbleRect(ctx, x, y, w, h, rand) {
  wobbleLine(ctx, x, y, x + w, y, 8, 2.2, rand);
  wobbleLine(ctx, x + w, y, x + w, y + h, 8, 2.2, rand);
  wobbleLine(ctx, x + w, y + h, x, y + h, 8, 2.2, rand);
  wobbleLine(ctx, x, y + h, x, y, 8, 2.2, rand);
}

function handwritten(ctx, text, x, y, size, color, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.font = `italic ${size}px Georgia, "Times New Roman", serif`;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

const LAYOUT = {
  header: [90, 80, 840, 78],
  logo: [108, 94, 50, 50],
  title: [200, 210, 620, 36],
  text: [200, 270, 480, 12],
  button: [330, 330, 200, 46],
  image: [90, 430, 400, 250],
  copy: [530, 430, 400, 250]
};

export function createPaperTexture() {
  const width = 1024;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const rand = seeded(42);

  ctx.fillStyle = "#e7dfd2";
  ctx.fillRect(0, 0, width, height);

  const stain = ctx.createRadialGradient(180, 1080, 10, 180, 1080, 160);
  stain.addColorStop(0, "rgba(140, 90, 50, 0.12)");
  stain.addColorStop(1, "rgba(140, 90, 50, 0)");
  ctx.fillStyle = stain;
  ctx.fillRect(0, 900, 360, 380);

  grain(ctx, width, height, 16, 7);

  ctx.strokeStyle = "rgba(42, 34, 28, 0.72)";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  wobbleRect(ctx, ...LAYOUT.header, rand);
  ctx.beginPath();
  ctx.arc(133, 119, 22, 0, Math.PI * 2);
  ctx.stroke();
  handwritten(ctx, "logo ?", 170, 126, 18, "rgba(42,34,28,0.55)", -0.04);

  wobbleLine(ctx, 90, 178, 930, 182, 14, 1.8, rand);

  handwritten(ctx, "TITRE", 200, 236, 36, "rgba(32,26,22,0.8)");
  wobbleLine(ctx, 200, 270, 680, 274, 12, 1.6, rand);
  wobbleLine(ctx, 200, 292, 560, 296, 10, 1.4, rand);
  wobbleLine(ctx, 200, 314, 610, 317, 10, 1.4, rand);

  wobbleRect(ctx, ...LAYOUT.button, rand);
  handwritten(ctx, "BOUTON", 372, 360, 20, "rgba(32,26,22,0.7)");

  wobbleLine(ctx, 90, 400, 930, 404, 14, 1.6, rand);

  wobbleRect(ctx, ...LAYOUT.image, rand);
  handwritten(ctx, "IMAGE", 230, 560, 22, "rgba(32,26,22,0.45)");
  wobbleRect(ctx, ...LAYOUT.copy, rand);
  wobbleLine(ctx, 560, 480, 880, 484, 8, 1.4, rand);
  wobbleLine(ctx, 560, 510, 840, 514, 8, 1.3, rand);
  wobbleLine(ctx, 560, 540, 860, 543, 8, 1.3, rand);
  wobbleLine(ctx, 560, 570, 800, 574, 8, 1.3, rand);
  handwritten(ctx, "TEXTE", 680, 640, 18, "rgba(32,26,22,0.45)");

  wobbleLine(ctx, 90, 710, 930, 714, 12, 1.5, rand);

  ctx.strokeStyle = "rgba(90, 40, 30, 0.55)";
  wobbleLine(ctx, 560, 500, 840, 504, 8, 1.2, rand);

  ctx.beginPath();
  ctx.ellipse(430, 350, 130, 40, -0.12, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(90, 50, 40, 0.45)";
  ctx.stroke();

  ctx.strokeStyle = "rgba(42,34,28,0.5)";
  ctx.beginPath();
  ctx.moveTo(290, 400);
  ctx.quadraticCurveTo(400, 390, 520, 430);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(500, 424);
  ctx.lineTo(520, 430);
  ctx.lineTo(506, 412);
  ctx.stroke();

  handwritten(ctx, "idée", 40, 240, 22, "rgba(50,40,34,0.5)", -0.35);
  handwritten(ctx, "site ?", 40, 780, 20, "rgba(50,40,34,0.45)", -0.2);
  handwritten(ctx, "app ?", 860, 200, 20, "rgba(50,40,34,0.42)", 0.22);
  handwritten(ctx, "IA ?", 870, 860, 22, "rgba(50,40,34,0.4)", 0.18);
  handwritten(ctx, "API", 48, 980, 20, "rgba(50,40,34,0.38)", -0.08);
  handwritten(ctx, "dashboard", 720, 980, 20, "rgba(50,40,34,0.38)", 0.06);
  handwritten(ctx, "header", 400, 70, 16, "rgba(50,40,34,0.35)", -0.02);
  handwritten(ctx, "CTA", 720, 348, 16, "rgba(50,40,34,0.4)", 0.1);
  handwritten(ctx, "contact", 80, 860, 16, "rgba(50,40,34,0.32)", -0.12);

  ctx.save();
  ctx.translate(140, 900);
  ctx.rotate(-0.08);
  ctx.fillStyle = "rgba(50,40,34,0.35)";
  ctx.font = "italic 18px Georgia, serif";
  ctx.fillText("urgent ?", 0, 0);
  ctx.strokeStyle = "rgba(90,40,30,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(86, 4);
  ctx.stroke();
  ctx.restore();

  handwritten(ctx, "MILYM", 340, 1180, 42, "rgba(32,26,22,0.28)");

  return canvasTexture(canvas);
}

export function createDigitalTexture() {
  const width = 1024;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0b0b12";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(512, 200, 40, 512, 400, 700);
  glow.addColorStop(0, "rgba(124, 58, 237, 0.18)");
  glow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(196, 181, 253, 0.55)";
  ctx.lineWidth = 1.5;

  const roundRect = (x, y, w, h, r = 12) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
  };

  roundRect(64, 48, 896, 72, 16);
  ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
  ctx.beginPath();
  ctx.roundRect(88, 66, 36, 36, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(245, 243, 255, 0.85)";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText("milym", 138, 92);
  ctx.fillStyle = "rgba(196, 181, 253, 0.7)";
  ctx.font = "500 14px Inter, system-ui, sans-serif";
  ctx.fillText("Accueil    Projets    Contact", 430, 92);
  roundRect(780, 64, 150, 40, 10);

  ctx.fillStyle = "rgba(245, 243, 255, 0.92)";
  ctx.font = "700 48px Inter, system-ui, sans-serif";
  ctx.fillText("Créateur de projets", 120, 240);
  ctx.fillStyle = "rgba(161, 161, 170, 0.9)";
  ctx.font = "400 20px Inter, system-ui, sans-serif";
  ctx.fillText("Une idée devient un produit numérique complet.", 120, 284);

  ctx.fillStyle = "rgba(124, 58, 237, 0.9)";
  ctx.beginPath();
  ctx.roundRect(120, 320, 210, 48, 12);
  ctx.fill();
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 16px Inter, system-ui, sans-serif";
  ctx.fillText("Créer mon projet", 148, 350);

  roundRect(120, 430, 380, 250, 18);
  roundRect(530, 430, 400, 250, 18);
  ctx.fillStyle = "rgba(124, 58, 237, 0.16)";
  ctx.beginPath();
  ctx.roundRect(140, 450, 340, 140, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(196, 181, 253, 0.8)";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("Nébula Dashboard", 150, 630);
  ctx.fillText("Sentinelle IA", 560, 490);
  ctx.fillStyle = "rgba(161, 161, 170, 0.8)";
  ctx.font = "400 14px Inter, system-ui, sans-serif";
  ctx.fillText("Application  ·  Node.js  ·  API", 150, 654);
  ctx.fillText("Assistant de veille intelligent", 560, 520);

  ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
  for (let y = 80; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(60, y);
    ctx.stroke();
  }

  return canvasTexture(canvas);
}

export function createLabelTexture(title, subtitle, width = 512, height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(8, 8, 14, 0.0)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 64px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, width / 2, height / 2 - 8);

  ctx.fillStyle = "rgba(196, 181, 253, 0.8)";
  ctx.font = "400 28px Inter, system-ui, sans-serif";
  ctx.fillText(subtitle, width / 2, height / 2 + 42);

  const texture = canvasTexture(canvas);
  texture.premultiplyAlpha = true;
  return texture;
}

function paintChrome(ctx, w, h, title) {
  ctx.fillStyle = "#0c0c12";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#16161f";
  ctx.fillRect(0, 0, w, 36);
  ctx.fillStyle = "#f87171";
  ctx.beginPath();
  ctx.arc(18, 18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(34, 18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#34d399";
  ctx.beginPath();
  ctx.arc(50, 18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(245,243,255,0.7)";
  ctx.font = "500 13px Inter, system-ui, sans-serif";
  ctx.fillText(title, 68, 22);
}

export function createBrowserTexture(variant = "site") {
  const w = 768;
  const h = 480;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  paintChrome(ctx, w, h, variant === "dashboard" ? "app.milym / dashboard" : "milym.fr");

  const hero = ctx.createLinearGradient(0, 36, w, h);
  hero.addColorStop(0, "#12081d");
  hero.addColorStop(1, "#0c0c12");
  ctx.fillStyle = hero;
  ctx.fillRect(0, 36, w, h - 36);

  ctx.fillStyle = "#c084fc";
  ctx.font = "700 32px Inter, system-ui, sans-serif";
  ctx.fillText(variant === "dashboard" ? "Pilotage" : "Milym", 40, 110);
  ctx.fillStyle = "rgba(245,243,255,0.82)";
  ctx.font = "400 16px Inter, system-ui, sans-serif";
  ctx.fillText(
    variant === "dashboard"
      ? "Revenus  ·  API  ·  Automatisations"
      : "Studio numérique — de l'idée au produit",
    40,
    140
  );

  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 230;
    ctx.fillStyle = "rgba(124,58,237,0.16)";
    ctx.beginPath();
    ctx.roundRect(x, 180, 210, 220, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(168,85,247,0.28)";
    ctx.stroke();
    ctx.fillStyle = "rgba(196,181,253,0.9)";
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.fillText(["Projets", "Services", "Contact"][i], x + 18, 214);
  }

  return canvasTexture(canvas);
}

export function createPhoneTexture() {
  const w = 360;
  const h = 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#07070b";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111118";
  ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("Application", 24, 40);

  const cards = ["Aujourd'hui", "API connectée", "3 tâches auto"];
  cards.forEach((label, i) => {
    ctx.fillStyle = "rgba(124,58,237,0.18)";
    ctx.beginPath();
    ctx.roundRect(20, 92 + i * 150, 320, 132, 18);
    ctx.fill();
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "600 20px Inter, system-ui, sans-serif";
    ctx.fillText(label, 40, 150 + i * 150);
  });

  ctx.fillStyle = "rgba(124,58,237,0.9)";
  ctx.beginPath();
  ctx.roundRect(20, 560, 320, 52, 14);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "600 16px Inter, system-ui, sans-serif";
  ctx.fillText("Ouvrir le flux", 120, 592);

  return canvasTexture(canvas);
}

export function createToolTexture() {
  const w = 640;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  paintChrome(ctx, w, h, "outil.milym");
  ctx.fillStyle = "#0a0a10";
  ctx.fillRect(0, 36, w, h - 36);
  ctx.fillStyle = "#c084fc";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText("Automatisation", 28, 80);

  const steps = ["Trigger", "Logic", "API", "Action"];
  steps.forEach((step, i) => {
    const x = 28 + i * 150;
    ctx.fillStyle = "rgba(124,58,237,0.2)";
    ctx.beginPath();
    ctx.roundRect(x, 120, 130, 72, 12);
    ctx.fill();
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.fillText(step, x + 18, 162);
    if (i < steps.length - 1) {
      ctx.strokeStyle = "rgba(168,85,247,0.5)";
      ctx.beginPath();
      ctx.moveTo(x + 130, 156);
      ctx.lineTo(x + 150, 156);
      ctx.stroke();
    }
  });

  return canvasTexture(canvas);
}

export function createAiPanelTexture() {
  const w = 640;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  paintChrome(ctx, w, h, "ia.milym");
  ctx.fillStyle = "#08060e";
  ctx.fillRect(0, 36, w, h - 36);
  ctx.fillStyle = "#ddd6fe";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText("Système intelligent", 28, 78);
  ctx.strokeStyle = "rgba(168,85,247,0.45)";
  for (let i = 0; i < 8; i++) {
    const x = 80 + (i % 4) * 140;
    const y = 140 + Math.floor(i / 4) * 120;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    if (i < 7) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(80 + ((i + 1) % 4) * 140, 140 + Math.floor((i + 1) / 4) * 120);
      ctx.stroke();
    }
  }
  return canvasTexture(canvas);
}
