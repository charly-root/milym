const express = require("express");
const rateLimit = require("express-rate-limit");

const { projectQueries, messageQueries, leadQueries } = require("../data/db");
const { categories } = require("../data/seed");
const funnel = require("../lib/funnel");

const router = express.Router();

// Limite : 5 envois de formulaire par IP toutes les 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    errors: { global: "Trop de tentatives. Réessayez dans quelques minutes." }
  }
});

// ── Pages ───────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  // hideNav : la page d'accueil s'affiche sans barre de navigation
  res.render("index", { pageTitle: "Accueil", hideNav: true });
});

router.get("/projets", (req, res) => {
  res.render("projects", {
    pageTitle: "Mes projets",
    projects: projectQueries.all(),
    categories
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", { pageTitle: "Contact" });
});

// ── Tunnel « Créer mon projet » ─────────────────────────────────────────────
// Le questionnaire est rechargé depuis la base à chaque requête : une
// modification faite dans /admin/tunnel est visible sans redémarrage.
function renderFunnel(res, definition, { errors = {}, values = {}, status = 200 } = {}) {
  res.status(status).render("funnel", {
    pageTitle: res.locals.settings.funnelTitle,
    steps: definition.steps,
    errors,
    values
  });
}

router.get("/creer-mon-projet", (req, res) => renderFunnel(res, funnel.load()));

// Le parcours guidé envoie du JSON ; sans JavaScript, le formulaire part en
// POST classique et reçoit une page en retour.
router.post("/creer-mon-projet", contactLimiter, (req, res) => {
  const wantsJson = Boolean(req.is("application/json"));
  const definition = funnel.load();
  const { errors, data } = funnel.parseAnswers(req.body, definition);

  if (Object.keys(errors).length > 0) {
    if (wantsJson) return res.status(400).json({ ok: false, errors });
    return renderFunnel(res, definition, { errors, values: req.body, status: 400 });
  }

  // L'estimation est toujours recalculée ici : celle affichée pendant le
  // parcours n'est qu'un aperçu et ne peut pas être considérée comme fiable
  const quote = funnel.estimate(data, definition);
  if (!quote) {
    const typeError = { type: "Choisissez un type de projet." };
    if (wantsJson) return res.status(400).json({ ok: false, errors: typeError });
    return renderFunnel(res, definition, { errors: typeError, values: req.body, status: 400 });
  }

  leadQueries.create({
    type: data.type,
    name: data.name,
    email: data.email,
    company: data.company || null,
    phone: data.phone || null,
    details: data.details || null,
    answers: data,
    estimateMin: quote.min,
    estimateMax: quote.max,
    monthlyMin: quote.monthly[0],
    monthlyMax: quote.monthly[1]
  });

  console.log(
    `Nouvelle demande ${data.type} de ${data.name} <${data.email}> : ${quote.min}–${quote.max} €`
  );

  if (wantsJson) return res.json({ ok: true, quote });
  res.render("quote", { pageTitle: "Votre estimation", quote });
});

// ── Formulaire de contact ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateContact(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (name.length < 2 || name.length > 100) {
    errors.name = "Le nom doit contenir entre 2 et 100 caractères.";
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    errors.email = "L'adresse e-mail n'est pas valide.";
  }
  if (subject.length < 3 || subject.length > 150) {
    errors.subject = "Le sujet doit contenir entre 3 et 150 caractères.";
  }
  if (message.length < 10 || message.length > 3000) {
    errors.message = "Le message doit contenir entre 10 et 3000 caractères.";
  }

  return { errors, data: { name, email, subject, message } };
}

router.post("/contact", contactLimiter, (req, res) => {
  const { errors, data } = validateContact(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  // Le message est enregistré en base et consultable depuis /admin/messages
  messageQueries.create(data);
  console.log(`Nouveau message de ${data.name} <${data.email}> : ${data.subject}`);

  res.json({ ok: true, message: "Message envoyé. Merci !" });
});

module.exports = router;
