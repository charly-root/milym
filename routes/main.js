const express = require("express");
const rateLimit = require("express-rate-limit");

const { projectQueries, messageQueries } = require("../data/db");
const { categories } = require("../data/seed");

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
