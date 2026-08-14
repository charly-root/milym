const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const {
  projectQueries,
  contactQueries,
  settingQueries,
  messageQueries,
  leadQueries,
  stepQueries,
  typeQueries,
  questionQueries,
  optionQueries
} = require("../data/db");
const { categories, contactKinds } = require("../data/seed");
const funnel = require("../lib/funnel");
const { iconNames, iconChoices } = require("../lib/icons");

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

// ── Protection CSRF ─────────────────────────────────────────────────────────
// Le cookie de session est déjà en SameSite=Lax : un formulaire hébergé sur un
// autre site n'emporte pas la session. Ce jeton ferme les cas restants — vieux
// navigateurs, page piégée servie depuis le même site.

function csrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  return req.session.csrfToken;
}

function checkCsrf(req) {
  const expected = req.session.csrfToken;
  const received = String(req.body._csrf || "");
  if (!expected || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Un jeton neuf accompagne le refus, pour que le formulaire de connexion
// affiché juste après soit immédiatement utilisable
function refuseCsrf(req, res) {
  res.status(403).render("admin/login", {
    pageTitle: "Requête refusée",
    csrfToken: csrfToken(req),
    error: "Jeton de sécurité absent ou périmé. Reconnectez-vous, puis recommencez."
  });
}

router.use((req, res, next) => {
  // Émettre un jeton ouvre une session en base : inutile de le faire pour les
  // robots qui sondent /admin sans jamais voir de formulaire
  const showsForm = req.session.isAdmin || req.path === "/login";
  res.locals.csrfToken = showsForm ? csrfToken(req) : "";

  // Le corps d'un envoi multipart n'est lu que plus tard, par multer : la route
  // concernée vérifie le jeton elle-même une fois l'analyse faite
  if (req.method !== "POST" || req.is("multipart/form-data")) return next();
  if (checkCsrf(req)) return next();
  refuseCsrf(req, res);
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
  if (!checkPassword(req.body.password)) {
    return res.status(401).render("admin/login", {
      pageTitle: "Connexion",
      error: "Mot de passe incorrect."
    });
  }
  // Identifiant de session renouvelé : un jeton connu avant la connexion ne
  // donne pas accès à la session privilégiée qui suit
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render("admin/login", {
        pageTitle: "Connexion",
        error: "La session n'a pas pu être ouverte. Réessayez."
      });
    }
    req.session.isAdmin = true;
    res.redirect("/admin");
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
    // Multer écrit le fichier avant que le jeton soit lisible : on le retire
    if (!checkCsrf(req)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return refuseCsrf(req, res);
    }

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

// ── Demandes du tunnel « Créer mon projet » ─────────────────────────────────
router.get("/demandes", (req, res) => {
  const definition = funnel.load();
  res.render("admin/leads", {
    pageTitle: "Admin — Demandes",
    // Le questionnaire complet est retraduit en libellés lisibles
    leads: leadQueries.all().map((lead) => ({ ...lead, summary: funnel.summarize(lead.answers, definition) })),
    typeLabels: Object.fromEntries(definition.types.map((t) => [t.slug, t.label]))
  });
});

router.post("/demandes/:id/supprimer", (req, res) => {
  leadQueries.remove(req.params.id);
  res.redirect("/admin/demandes");
});

// ── Contenu du tunnel « Créer mon projet » ──────────────────────────────────
// Étapes, types de projet, questions, réponses et tarifs se règlent ici. Les
// modifications sont prises en compte immédiatement sur le site : la page
// publique relit la base à chaque affichage.

/** Nombre entier borné, tolérant aux champs vides ou mal remplis. */
function toInt(value, { min = 0, max = 1000000, fallback = 0 } = {}) {
  const parsed = Math.round(Number(String(value).replace(",", ".")));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toFloat(value, { min = 0, max = 100, fallback = 1 } = {}) {
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
}

/** Un champ de formulaire répété arrive sous forme de tableau, ou seul. */
function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ── Vue d'ensemble ──────────────────────────────────────────────────────────
router.get("/tunnel", (req, res) => {
  const steps = stepQueries.all();
  const questions = questionQueries.all();
  const types = typeQueries.all();
  const typeLabels = Object.fromEntries(types.map((t) => [t.slug, t.label]));

  res.render("admin/funnel", {
    pageTitle: "Admin — Tunnel",
    types,
    typeLabels,
    questionTypes: Object.fromEntries(funnel.QUESTION_TYPES),
    // Chaque étape porte ses questions, dans l'ordre d'affichage
    steps: steps.map((step) => ({
      ...step,
      questions: questions
        .filter((question) => question.stepId === step.id)
        .map((question) => ({ ...question, options: optionQueries.forQuestion(question.id) }))
    })),
    settings: settingQueries.all()
  });
});

// ── Types de projet ─────────────────────────────────────────────────────────
function parseTypeForm(body) {
  const errors = [];
  const label = String(body.label || "").trim();
  const tagline = String(body.tagline || "").trim();
  const icon = String(body.icon || "").trim();
  const slug = slugify(body.slug || label);

  if (label.length < 2 || label.length > 60) errors.push("Le nom doit contenir entre 2 et 60 caractères.");
  if (tagline.length > 160) errors.push("La phrase d'accroche est limitée à 160 caractères.");
  if (!iconNames.includes(icon)) errors.push("Icône invalide.");
  if (!slug) errors.push("Impossible de générer un identifiant à partir du nom.");

  return {
    errors,
    data: {
      slug,
      label,
      tagline,
      icon,
      basePrice: toInt(body.basePrice, { max: 500000 }),
      position: toInt(body.position, { max: 999 })
    }
  };
}

function renderTypeForm(res, { type, errors = [], status = 200 }) {
  res.status(status).render("admin/funnel-type-form", {
    pageTitle: type && type.id ? "Admin — Modifier le type" : "Admin — Nouveau type",
    type,
    iconChoices,
    errors
  });
}

router.get("/tunnel/types/nouveau", (req, res) => {
  renderTypeForm(res, {
    type: { id: null, slug: "", label: "", tagline: "", icon: "etincelles", basePrice: 2000, position: typeQueries.all().length }
  });
});

router.post("/tunnel/types", (req, res) => {
  const { errors, data } = parseTypeForm(req.body);
  if (errors.length > 0) return renderTypeForm(res, { type: { ...data, id: null }, errors, status: 400 });
  try {
    typeQueries.create(data);
  } catch {
    return renderTypeForm(res, {
      type: { ...data, id: null },
      errors: ["Cet identifiant est déjà utilisé par un autre type de projet."],
      status: 400
    });
  }
  res.redirect("/admin/tunnel");
});

router.get("/tunnel/types/:id/modifier", (req, res, next) => {
  const type = typeQueries.get(req.params.id);
  if (!type) return next();
  renderTypeForm(res, { type });
});

router.post("/tunnel/types/:id", (req, res, next) => {
  const type = typeQueries.get(req.params.id);
  if (!type) return next();
  const { errors, data } = parseTypeForm(req.body);
  if (errors.length > 0) return renderTypeForm(res, { type: { ...data, id: type.id }, errors, status: 400 });
  try {
    typeQueries.update(type.id, data);
  } catch {
    return renderTypeForm(res, {
      type: { ...data, id: type.id },
      errors: ["Cet identifiant est déjà utilisé par un autre type de projet."],
      status: 400
    });
  }
  // Renommer l'identifiant casserait le ciblage des questions : on le répercute
  if (data.slug !== type.slug) {
    for (const question of questionQueries.all()) {
      if (!question.showFor.includes(type.slug)) continue;
      questionQueries.update(question.id, {
        ...question,
        showFor: question.showFor.map((slug) => (slug === type.slug ? data.slug : slug))
      });
    }
  }
  res.redirect("/admin/tunnel");
});

// Sans aucun type de projet, le tunnel n'a plus de première question et devient
// impossible à remplir : le dernier reste en place
router.post("/tunnel/types/:id/supprimer", (req, res) => {
  const type = typeQueries.get(req.params.id);
  if (!type || typeQueries.all().length <= 1) return res.redirect("/admin/tunnel");

  typeQueries.remove(type.id);

  // Une question réservée au type disparu ne serait plus jamais posée : elle
  // repasse aux types restants, ou à tout le monde s'il n'en reste aucun
  for (const question of questionQueries.all()) {
    if (!question.showFor.includes(type.slug)) continue;
    questionQueries.update(question.id, {
      ...question,
      showFor: question.showFor.filter((slug) => slug !== type.slug)
    });
  }

  res.redirect("/admin/tunnel");
});

// ── Étapes ──────────────────────────────────────────────────────────────────
function parseStepForm(body) {
  const errors = [];
  const title = String(body.title || "").trim();
  const shortLabel = String(body.shortLabel || "").trim();
  const description = String(body.description || "").trim();

  if (title.length < 2 || title.length > 120) errors.push("Le titre doit contenir entre 2 et 120 caractères.");
  if (shortLabel.length > 24) errors.push("Le nom du jalon est limité à 24 caractères.");
  if (description.length > 300) errors.push("La description est limitée à 300 caractères.");

  return { errors, data: { title, shortLabel, description, position: toInt(body.position, { max: 999 }) } };
}

function renderStepForm(res, { step, errors = [], status = 200 }) {
  res.status(status).render("admin/funnel-step-form", {
    pageTitle: step && step.id ? "Admin — Modifier l'étape" : "Admin — Nouvelle étape",
    step,
    errors
  });
}

router.get("/tunnel/etapes/nouvelle", (req, res) => {
  renderStepForm(res, {
    step: { id: null, title: "", shortLabel: "", description: "", position: stepQueries.all().length }
  });
});

router.post("/tunnel/etapes", (req, res) => {
  const { errors, data } = parseStepForm(req.body);
  if (errors.length > 0) return renderStepForm(res, { step: { ...data, id: null }, errors, status: 400 });
  stepQueries.create(data);
  res.redirect("/admin/tunnel");
});

router.get("/tunnel/etapes/:id/modifier", (req, res, next) => {
  const step = stepQueries.get(req.params.id);
  if (!step) return next();
  renderStepForm(res, { step });
});

router.post("/tunnel/etapes/:id", (req, res, next) => {
  const step = stepQueries.get(req.params.id);
  if (!step) return next();
  const { errors, data } = parseStepForm(req.body);
  if (errors.length > 0) return renderStepForm(res, { step: { ...data, id: step.id }, errors, status: 400 });
  stepQueries.update(step.id, data);
  res.redirect("/admin/tunnel");
});

// Supprimer une étape emporte ses questions (contrainte ON DELETE CASCADE)
router.post("/tunnel/etapes/:id/supprimer", (req, res) => {
  if (stepQueries.all().length > 1) stepQueries.remove(req.params.id);
  res.redirect("/admin/tunnel");
});

// ── Questions et réponses ───────────────────────────────────────────────────
// « type » désigne la question d'ouverture, fabriquée depuis les types de
// projet, et « global » sert aux messages d'erreur généraux
const RESERVED_KEYS = ["type", "global"];

function parseQuestionForm(body) {
  const errors = [];
  const label = String(body.label || "").trim();
  const help = String(body.help || "").trim();
  const type = String(body.type || "").trim();
  const stepId = toInt(body.stepId);
  const qkey = slugify(body.qkey || label).replace(/-/g, "_");

  if (label.length < 2 || label.length > 200) errors.push("La question doit contenir entre 2 et 200 caractères.");
  if (help.length > 300) errors.push("La précision est limitée à 300 caractères.");
  if (!funnel.QUESTION_TYPES.some(([id]) => id === type)) errors.push("Type de champ invalide.");
  if (!stepQueries.get(stepId)) errors.push("Étape invalide.");
  if (!qkey) errors.push("Impossible de générer un identifiant à partir de la question.");
  if (RESERVED_KEYS.includes(qkey)) errors.push(`L'identifiant « ${qkey} » est réservé.`);

  // Une question n'est posée qu'aux types cochés ; aucun coché = posée à tous
  const typeSlugs = typeQueries.all().map((t) => t.slug);
  const showFor = toArray(body.showFor).map(String).filter((slug) => typeSlugs.includes(slug));

  // Chaque type de champ n'utilise que les réglages qui le concernent
  const config = {};
  if (type === "number") {
    config.min = toInt(body.numberMin, { max: 9999 });
    config.max = toInt(body.numberMax, { min: config.min + 1, max: 9999, fallback: config.min + 1 });
    config.default = toInt(body.numberDefault, { min: config.min, max: config.max, fallback: config.min });
    config.included = toInt(body.numberIncluded, { max: config.max });
    config.perUnit = toInt(body.numberPerUnit, { max: 100000 });
  } else if (funnel.FREE_TEXT_TYPES.includes(type)) {
    config.maxLength = toInt(body.maxLength, { min: 10, max: 5000, fallback: 200 });
  }

  // Les réponses arrivent en colonnes parallèles, une entrée par ligne du
  // tableau d'édition. La valeur stockée est conservée quand elle existe déjà,
  // pour que les demandes déjà reçues restent lisibles.
  const options = [];
  if (funnel.CHOICE_TYPES.includes(type)) {
    const labels = toArray(body.optLabel);
    const values = toArray(body.optValue);
    const helps = toArray(body.optHelp);
    const iconsIn = toArray(body.optIcon);
    const prices = toArray(body.optPrice);
    const factors = toArray(body.optFactor);
    const monthlyMins = toArray(body.optMonthlyMin);
    const monthlyMaxes = toArray(body.optMonthlyMax);
    const used = new Set();

    labels.forEach((raw, i) => {
      const optionLabel = String(raw).trim();
      if (!optionLabel) return;

      let value = slugify(values[i] || optionLabel);
      if (!value) value = `reponse-${i + 1}`;
      while (used.has(value)) value = `${value}-2`;
      used.add(value);

      options.push({
        value,
        label: optionLabel.slice(0, 160),
        help: String(helps[i] || "").trim().slice(0, 200),
        icon: iconNames.includes(String(iconsIn[i])) ? String(iconsIn[i]) : "etincelles",
        price: toInt(prices[i], { max: 500000 }),
        factor: toFloat(factors[i], { min: 0.1, max: 10, fallback: 1 }),
        monthlyMin: toInt(monthlyMins[i], { max: 100000 }),
        monthlyMax: toInt(monthlyMaxes[i], { max: 100000 })
      });
    });

    if (options.length < 2) errors.push("Une question à choix demande au moins deux réponses.");
  }

  return {
    errors,
    data: {
      stepId,
      qkey,
      type,
      label,
      help,
      required: body.required ? 1 : 0,
      showFor,
      config,
      position: toInt(body.position, { max: 999 })
    },
    options
  };
}

function renderQuestionForm(res, { question, options, errors = [], status = 200 }) {
  res.status(status).render("admin/funnel-question-form", {
    pageTitle: question && question.id ? "Admin — Modifier la question" : "Admin — Nouvelle question",
    question,
    options,
    steps: stepQueries.all(),
    types: typeQueries.all(),
    questionTypes: funnel.QUESTION_TYPES,
    choiceTypes: funnel.CHOICE_TYPES,
    freeTextTypes: funnel.FREE_TEXT_TYPES,
    iconChoices,
    errors
  });
}

const BLANK_OPTION = { value: "", label: "", help: "", icon: "etincelles", price: 0, factor: 1, monthlyMin: 0, monthlyMax: 0 };

router.get("/tunnel/questions/nouvelle", (req, res) => {
  const steps = stepQueries.all();
  const requested = toInt(req.query.etape, { fallback: 0 });
  const stepId = steps.some((s) => s.id === requested) ? requested : (steps[0] || {}).id;

  renderQuestionForm(res, {
    question: {
      id: null,
      stepId,
      qkey: "",
      type: "radio",
      label: "",
      help: "",
      required: 0,
      showFor: [],
      config: {},
      position: questionQueries.all().length
    },
    options: [{ ...BLANK_OPTION }, { ...BLANK_OPTION }]
  });
});

router.post("/tunnel/questions", (req, res) => {
  const { errors, data, options } = parseQuestionForm(req.body);
  if (errors.length > 0) {
    return renderQuestionForm(res, { question: { ...data, id: null }, options, errors, status: 400 });
  }
  let questionId;
  try {
    questionId = questionQueries.create(data).lastInsertRowid;
  } catch {
    return renderQuestionForm(res, {
      question: { ...data, id: null },
      options,
      errors: ["Cet identifiant est déjà utilisé par une autre question."],
      status: 400
    });
  }
  optionQueries.replaceAll(questionId, options);
  res.redirect("/admin/tunnel");
});

router.get("/tunnel/questions/:id/modifier", (req, res, next) => {
  const question = questionQueries.get(req.params.id);
  if (!question) return next();
  const options = optionQueries.forQuestion(question.id);
  renderQuestionForm(res, {
    question,
    options: options.length > 0 ? options : [{ ...BLANK_OPTION }, { ...BLANK_OPTION }]
  });
});

router.post("/tunnel/questions/:id", (req, res, next) => {
  const question = questionQueries.get(req.params.id);
  if (!question) return next();
  const { errors, data, options } = parseQuestionForm(req.body);
  if (errors.length > 0) {
    return renderQuestionForm(res, { question: { ...data, id: question.id }, options, errors, status: 400 });
  }
  try {
    questionQueries.update(question.id, data);
  } catch {
    return renderQuestionForm(res, {
      question: { ...data, id: question.id },
      options,
      errors: ["Cet identifiant est déjà utilisé par une autre question."],
      status: 400
    });
  }
  // Passer une question à choix en champ texte ne doit pas effacer ses
  // réponses : elles resteront en place si le type est rétabli
  if (funnel.CHOICE_TYPES.includes(data.type)) optionQueries.replaceAll(question.id, options);
  res.redirect("/admin/tunnel");
});

router.post("/tunnel/questions/:id/supprimer", (req, res) => {
  questionQueries.remove(req.params.id);
  res.redirect("/admin/tunnel");
});

// ── Textes et réglages tarifaires ───────────────────────────────────────────
// [clé, libellé, longueur max, nombre de lignes]
const FUNNEL_TEXT_FIELDS = [
  ["funnelCtaLabel", "Libellé du bouton dans la navigation", 40, 1],
  ["funnelTitle", "Titre de la page", 80, 1],
  ["funnelIntro", "Texte d'introduction", 400, 3],
  ["funnelResultLabel", "Nom du dernier jalon", 24, 1],
  ["funnelResultTitle", "Titre de l'estimation", 80, 1],
  ["funnelResultIntro", "Texte au-dessus de l'estimation", 300, 2],
  ["funnelDisclaimer", "Mention sous l'estimation", 500, 3]
];

// [clé, libellé, précision]
const FUNNEL_NUMBER_FIELDS = [
  ["funnelSpreadLow", "Bas de fourchette", "Part du prix de référence retenue comme minimum (0,85 = −15 %)."],
  ["funnelSpreadHigh", "Haut de fourchette", "Part du prix de référence retenue comme maximum (1,35 = +35 %)."],
  ["funnelWeeksLowDivisor", "Diviseur du délai minimum", "Budget médian divisé par ce montant = nombre de semaines le plus court."],
  ["funnelWeeksHighDivisor", "Diviseur du délai maximum", "Plus il est bas, plus le délai annoncé est long."]
];

function renderFunnelSettings(res, { errors = [], saved = false, status = 200 } = {}) {
  res.status(status).render("admin/funnel-settings", {
    pageTitle: "Admin — Réglages du tunnel",
    current: settingQueries.all(),
    textFields: FUNNEL_TEXT_FIELDS,
    numberFields: FUNNEL_NUMBER_FIELDS,
    // Aperçu du calcul avec les coefficients en vigueur
    preview: funnel.pricing(),
    errors,
    saved
  });
}

router.get("/tunnel/reglages", (req, res) => renderFunnelSettings(res));

router.post("/tunnel/reglages", (req, res) => {
  const errors = [];
  const values = {};

  for (const [key, label, maxLength] of FUNNEL_TEXT_FIELDS) {
    const value = String(req.body[key] || "").trim();
    if (!value) errors.push(`Le champ « ${label} » est obligatoire.`);
    else if (value.length > maxLength) errors.push(`Le champ « ${label} » est limité à ${maxLength} caractères.`);
    else values[key] = value;
  }

  for (const [key, label] of FUNNEL_NUMBER_FIELDS) {
    const value = Number(String(req.body[key] || "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) errors.push(`Le champ « ${label} » doit être un nombre positif.`);
    else values[key] = String(value);
  }

  if (Number(values.funnelSpreadLow) > Number(values.funnelSpreadHigh)) {
    errors.push("Le bas de fourchette doit être inférieur au haut de fourchette.");
  }

  if (errors.length > 0) return renderFunnelSettings(res, { errors, status: 400 });

  for (const [key, value] of Object.entries(values)) settingQueries.set(key, value);
  renderFunnelSettings(res, { saved: true });
});

module.exports = router;
