// Génère des images SVG de remplacement pour les projets.
// Usage : node scripts/generate-images.js
// À remplacer par de vraies captures d'écran dans public/images/.

const fs = require("fs");
const path = require("path");

const projects = [
  { slug: "nebula-dashboard", label: "Nébula Dashboard", hue: 265 },
  { slug: "atelier-lumiere", label: "Atelier Lumière", hue: 280 },
  { slug: "sentinelle-ia", label: "Sentinelle IA", hue: 255 },
  { slug: "forge-cli", label: "Forge CLI", hue: 270 },
  { slug: "orbite-3d", label: "Orbite 3D", hue: 290 },
  { slug: "kiosque", label: "Kiosque", hue: 260 },
  { slug: "palette-studio", label: "Palette Studio", hue: 285 },
  { slug: "echos", label: "Échos", hue: 250 }
];

const outDir = path.join(__dirname, "..", "public", "images");
fs.mkdirSync(outDir, { recursive: true });

for (const { slug, label, hue } of projects) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="640" y2="400" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0c0c12"/>
      <stop offset="1" stop-color="hsl(${hue}, 45%, 12%)"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.75" cy="0.25" r="0.8">
      <stop stop-color="hsla(${hue}, 85%, 60%, 0.35)"/>
      <stop offset="1" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <rect width="640" height="400" fill="url(#halo)"/>
  <g stroke="hsla(${hue}, 70%, 65%, 0.12)" stroke-width="1">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${(i + 1) * 64}" y1="0" x2="${(i + 1) * 64}" y2="400"/>`).join("\n    ")}
    ${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${(i + 1) * 67}" x2="640" y2="${(i + 1) * 67}"/>`).join("\n    ")}
  </g>
  <circle cx="500" cy="110" r="70" fill="none" stroke="hsla(${hue}, 80%, 70%, 0.35)" stroke-width="1.5"/>
  <circle cx="500" cy="110" r="42" fill="hsla(${hue}, 80%, 60%, 0.18)"/>
  <text x="48" y="330" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="700"
        fill="hsl(${hue}, 60%, 85%)">${label}</text>
  <rect x="48" y="348" width="72" height="4" rx="2" fill="hsl(${hue}, 80%, 60%)"/>
</svg>
`;
  fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);
  console.log(`Créé : public/images/${slug}.svg`);
}
