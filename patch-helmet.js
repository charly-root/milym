#!/usr/bin/env node
/**
 * Remplace la config Helmet pour éviter HSTS / upgrade-insecure-requests
 * (cause de boucles de chargement sans HTTPS fonctionnel).
 */
const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "app.js");
let src = fs.readFileSync(appPath, "utf8");

const startMarker = "// ── Sécurité";
const endMarker = "// Limitation de la taille des requêtes";

const start = src.indexOf(startMarker);
const end = src.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  console.error("patch-helmet: marqueurs introuvables dans app.js");
  process.exit(1);
}

const replacement = `// ── Sécurité ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // 'unsafe-inline' est nécessaire pour les attributs style des templates
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        scriptSrcAttr: ["'none'"]
      }
    },
    // HSTS laissé à Traefik — évite les boucles https:// sans certificat prêt
    strictTransportSecurity: false
  })
);

`;

src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(appPath, src);
console.log("patch-helmet: OK");
