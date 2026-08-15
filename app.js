require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");

const { db, contactQueries, settingQueries } = require("./data/db");
const { iconPaths } = require("./lib/icons");
const { createSessionStore } = require("./lib/session-store");
const mainRoutes = require("./routes/main");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Traefik termine le TLS et transmet en HTTP sur 127.0.0.1. Sans cette ligne,
// req.secure reste faux : le cookie de session (secure en production) n'est
// jamais posé et le limiteur de débit voit l'IP du proxy au lieu de celle du
// visiteur. Un seul saut de confiance, le port n'étant pas exposé publiquement.
app.set("trust proxy", 1);

// ── Sécurité ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // 'unsafe-inline' est nécessaire pour les attributs style des templates
        // (perspective 3D, délais d'animation) — les scripts inline restent bloqués
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

// Limitation de la taille des requêtes. Le questionnaire du tunnel se modifie
// d'un bloc, réponses comprises : le centre de contrôle a droit à plus de marge
// que les formulaires ouverts à tous.
app.use("/admin", express.urlencoded({ extended: true, limit: "200kb" }));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Session pour le centre de contrôle, conservée en base : un redéploiement ne
// déconnecte plus. Sans SESSION_SECRET dans .env, un secret est tiré au hasard
// à chaque démarrage et invaliderait les sessions enregistrées.
if (!process.env.SESSION_SECRET) {
  console.warn(
    "ATTENTION : SESSION_SECRET n'est pas défini dans .env — les sessions du centre de contrôle seront perdues à chaque redémarrage."
  );
}

app.use(
  session({
    store: createSessionStore(db),
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 4 // 4 heures
    }
  })
);

// ── Templates & fichiers statiques ──────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Variables disponibles dans tous les templates
app.use((req, res, next) => {
  const settings = settingQueries.all();
  res.locals.currentPath = req.path;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.contacts = contactQueries.all();
  res.locals.settings = settings;
  res.locals.site = {
    name: settings.siteName,
    logo: settings.logoPath
  };
  // Montants du tunnel de vente et des demandes reçues
  res.locals.euro = (n) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} €`;
  // Jeu d'icônes utilisé par partials/icon.ejs
  res.locals.iconPaths = iconPaths;
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/admin", adminRoutes);
app.use("/", mainRoutes);

// Page 404 personnalisée
app.use((req, res) => {
  res.status(404).render("404", { pageTitle: "Page introuvable" });
});

app.listen(PORT, () => {
  console.log(`Serveur milym démarré sur http://localhost:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("ATTENTION : ADMIN_PASSWORD n'est pas défini dans .env — le centre de contrôle est inaccessible.");
  }
});
