const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const { projectQueries, contactQueries, settingQueries, messageQueries } = require("../data/db");
const { categories, contactKinds } = require("../data/seed");

const router = express.Router();

// Catégories proposées dans le formulaire projet (sans le filtre "Tous")
const projectCategories = categories.filter((c) => c !== "Tous");

// Limite les tentatives de connexion : 10 par IP toutes les 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// ── Authentification ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect("/admin/login");
}

// Comparaison en temps constant pour éviter les attaques par timing
function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(String(candidate)).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

router.get("/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.render("admin/login", { pageTitle: "Connexion", error: null });
});

router.post("/login", loginLimiter, (req, res) => {
  if (checkPassword(req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.status(401).render("admin/login", {
    pageTitle: "Connexion",
    error: "Mot de passe incorrect."
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Toutes les routes suivantes nécessitent d'être connecté
router.use(requireAdmin);

router.get("/", (req, res) => res.redirect("/admin/projets"));

// ── Validation ──────────────────────────────────────────────────────────────
function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseProjectForm(body) {
  const errors = [];
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const image = String(body.image || "").trim();
  const projectUrl = String(body.projectUrl || "").trim();
  const githubUrl = String(body.githubUrl || "").trim();
  const technologies = String(body.technologies || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (title.length < 2 || title.length > 100) errors.push("Le titre doit contenir entre 2 et 100 caractères.");
  if (description.length < 10 || description.length > 500) errors.push("La description doit contenir entre 10 et 500 caractères.");
  if (!projectCategories.includes(category)) errors.push("Catégorie invalide.");
  if (technologies.length === 0) errors.push("Indiquez au moins une technologie (séparées par des virgules).");

  const slug = slugify(body.slug || title);
  if (!slug) errors.push("Impossible de générer un identifiant (slug) à partir du titre.");

  return {
    errors,
    data: { title, slug, description, category, technologies, image, projectUrl, githubUrl: githubUrl || null }
  };
}

function parseContactForm(body) {
  const errors = [];
  const kind = String(body.kind || "").trim();
  const label = String(body.label || "").trim();
  const value = String(body.value || "").trim();

  if (!contactKinds.includes(kind)) errors.push("Type de contact invalide.");
  if (label.length < 2 || label.length > 60) errors.push("Le libellé doit contenir entre 2 et 60 caractères.");
  if (value.length < 3 || value.length > 254) errors.push("La valeur doit contenir entre 3 et 254 caractères.");

  return { errors, data: { kind, label, value } };
}

// ── Accueil & logo ──────────────────────────────────────────────────────────
const LOGO_EXTENSIONS = { "image/svg+xml": ".svg", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "public", "logos"),
    filename: (req, file, cb) => cb(null, `logo-${Date.now()}${LOGO_EXTENSIONS[file.mimetype]}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo maximum
  fileFilter: (req, file, cb) => {
    if (LOGO_EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(new Error("Format d'image non supporté (SVG, PNG, JPG ou WebP uniquement)."));
  }
});

// Champs texte modifiables : [clé, libellé, longueur max]
const SETTING_FIELDS = [
  ["siteName", "Nom du site", 40],
  ["heroTitle", "Titre principal", 80],
  ["heroSubtitle", "Phrase secondaire", 300],
  ["aboutText", "Texte À propos", 1000],
  ["stat1Value", "Statistique 1 — valeur", 20],
  ["stat1Label", "Statistique 1 — libellé", 60],
  ["stat2Value", "Statistique 2 — valeur", 20],
  ["stat2Label", "Statistique 2 — libellé", 60],
  ["stat3Value", "Statistique 3 — valeur", 20],
  ["stat3Label", "Statistique 3 — libellé", 60]
];

function renderSiteForm(res, { errors = [], saved = false, status = 200 } = {}) {
  res.status(status).render("admin/site-form", {
    pageTitle: "Admin — Accueil",
    current: settingQueries.all(),
    errors,
    saved
  });
}

router.get("/accueil", (req, res) => renderSiteForm(res));

router.post("/accueil", (req, res) => {
  uploadLogo.single("logo")(req, res, (uploadError) => {
    const errors = [];
    if (uploadError) {
      errors.push(
        uploadError.code === "LIMIT_FILE_SIZE" ? "Le logo ne doit pas dépasser 2 Mo." : uploadError.message
      );
    }

    const values = {};
    for (const [key, label, maxLength] of SETTING_FIELDS) {
      const value = String(req.body[key] || "").trim();
      if (!value) errors.push(`Le champ « ${label} » est obligatoire.`);
      else if (value.length > maxLength) errors.push(`Le champ « ${label} » est limité à ${maxLength} caractères.`);
      else values[key] = value;
    }

    if (errors.length > 0) return renderSiteForm(res, { errors, status: 400 });

    for (const [key, value] of Object.entries(values)) settingQueries.set(key, value);

    if (req.file) {
      // Supprime l'ancien logo uploadé (le logo d'origine logo.svg est conservé)
      const previous = settingQueries.all().logoPath;
      if (/^\/logos\/logo-\d+\./.test(previous)) {
        fs.unlink(path.join(__dirname, "..", "public", previous), () => {});
      }
      settingQueries.set("logoPath", `/logos/${req.file.filename}`);
    }

    renderSiteForm(res, { saved: true });
  });
});

// ── Projets ─────────────────────────────────────────────────────────────────
router.get("/projets", (req, res) => {
  res.render("admin/projects", {
    pageTitle: "Admin — Projets",
    projects: projectQueries.all()
  });
});

router.get("/projets/nouveau", (req, res) => {
  res.render("admin/project-form", {
    pageTitle: "Admin — Nouveau projet",
    project: null,
    categories: projectCategories,
    errors: []
  });
});

router.post("/projets", (req, res) => {
  const { errors, data } = parseProjectForm(req.body);
  if (errors.length > 0) {
    return res.status(400).render("admin/project-form", {
      pageTitle: "Admin — Nouveau projet",
      project: { ...data, id: null },
      categories: projectCategories,
      errors
    });
  }
  try {
    projectQueries.create(data);
  } catch (err) {
    return res.status(400).render("admin/project-form", {
      pageTitle: "Admin — Nouveau projet",
      project: { ...data, id: null },
      categories: projectCategories,
      errors: ["Ce slug est déjà utilisé par un autre projet."]
    });
  }
  res.redirect("/admin/projets");
});

router.get("/projets/:id/modifier", (req, res, next) => {
  const project = projectQueries.get(req.params.id);
  if (!project) return next();
  res.render("admin/project-form", {
    pageTitle: "Admin — Modifier le projet",
    project,
    categories: projectCategories,
    errors: []
  });
});

router.post("/projets/:id", (req, res, next) => {
  const project = projectQueries.get(req.params.id);
  if (!project) return next();
  const { errors, data } = parseProjectForm(req.body);
  if (errors.length > 0) {
    return res.status(400).render("admin/project-form", {
      pageTitle: "Admin — Modifier le projet",
      project: { ...data, id: project.id },
      categories: projectCategories,
      errors
    });
  }
  try {
    projectQueries.update(project.id, data);
  } catch (err) {
    return res.status(400).render("admin/project-form", {
      pageTitle: "Admin — Modifier le projet",
      project: { ...data, id: project.id },
      categories: projectCategories,
      errors: ["Ce slug est déjà utilisé par un autre projet."]
    });
  }
  res.redirect("/admin/projets");
});

router.post("/projets/:id/supprimer", (req, res) => {
  projectQueries.remove(req.params.id);
  res.redirect("/admin/projets");
});

// ── Contacts ────────────────────────────────────────────────────────────────
router.get("/contacts", (req, res) => {
  res.render("admin/contacts", {
    pageTitle: "Admin — Contacts",
    contactList: contactQueries.all()
  });
});

router.get("/contacts/nouveau", (req, res) => {
  res.render("admin/contact-form", {
    pageTitle: "Admin — Nouveau contact",
    contact: null,
    kinds: contactKinds,
    errors: []
  });
});

router.post("/contacts", (req, res) => {
  const { errors, data } = parseContactForm(req.body);
  if (errors.length > 0) {
    return res.status(400).render("admin/contact-form", {
      pageTitle: "Admin — Nouveau contact",
      contact: { ...data, id: null },
      kinds: contactKinds,
      errors
    });
  }
  contactQueries.create(data);
  res.redirect("/admin/contacts");
});

router.get("/contacts/:id/modifier", (req, res, next) => {
  const contact = contactQueries.get(req.params.id);
  if (!contact) return next();
  res.render("admin/contact-form", {
    pageTitle: "Admin — Modifier le contact",
    contact,
    kinds: contactKinds,
    errors: []
  });
});

router.post("/contacts/:id", (req, res, next) => {
  const contact = contactQueries.get(req.params.id);
  if (!contact) return next();
  const { errors, data } = parseContactForm(req.body);
  if (errors.length > 0) {
    return res.status(400).render("admin/contact-form", {
      pageTitle: "Admin — Modifier le contact",
      contact: { ...data, id: contact.id },
      kinds: contactKinds,
      errors
    });
  }
  contactQueries.update(contact.id, data);
  res.redirect("/admin/contacts");
});

router.post("/contacts/:id/supprimer", (req, res) => {
  contactQueries.remove(req.params.id);
  res.redirect("/admin/contacts");
});

// ── Messages reçus ──────────────────────────────────────────────────────────
router.get("/messages", (req, res) => {
  res.render("admin/messages", {
    pageTitle: "Admin — Messages",
    messages: messageQueries.all()
  });
});

router.post("/messages/:id/supprimer", (req, res) => {
  messageQueries.remove(req.params.id);
  res.redirect("/admin/messages");
});

module.exports = router;
