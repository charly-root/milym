require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");

const { contactQueries, settingQueries } = require("./data/db");
const mainRoutes = require("./routes/main");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

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
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

// Limitation de la taille des requêtes
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Session pour le centre de contrôle
app.use(
  session({
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
