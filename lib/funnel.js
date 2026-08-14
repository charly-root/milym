// Tunnel de vente : chargement du questionnaire, validation et estimation.
//
// Tout le contenu (étapes, types de projet, questions, réponses, tarifs, icônes)
// vit en base et se modifie depuis /admin/tunnel. Le contenu de départ est dans
// lib/funnel-seed.js, inséré une seule fois à la création de la base.
//
// Ce module est l'unique source de vérité pour trois usages :
//   1. générer le formulaire (views/funnel.ejs) ;
//   2. recalculer l'estimation côté serveur, seule valeur qui fasse foi ;
//   3. relire les réponses en clair dans /admin/demandes.

const {
  settingQueries,
  stepQueries,
  typeQueries,
  questionQueries,
  optionQueries
} = require("../data/db");

// Types de champ acceptés, avec leur libellé pour le formulaire d'admin
const QUESTION_TYPES = [
  ["radio", "Choix unique"],
  ["checkbox", "Choix multiples"],
  ["number", "Nombre"],
  ["text", "Texte court"],
  ["email", "Adresse e-mail"],
  ["tel", "Téléphone"],
  ["textarea", "Texte long"]
];

const CHOICE_TYPES = ["radio", "checkbox"];
const FREE_TEXT_TYPES = ["text", "email", "tel", "textarea"];

// Réglages du calcul, modifiables depuis /admin/tunnel/reglages
const PRICING_SETTINGS = {
  funnelSpreadLow: 0.85,
  funnelSpreadHigh: 1.35,
  funnelWeeksLowDivisor: 3000,
  funnelWeeksHighDivisor: 1600
};

function pricing() {
  const stored = settingQueries.all();
  const values = {};
  for (const [key, fallback] of Object.entries(PRICING_SETTINGS)) {
    const parsed = Number(stored[key]);
    values[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
  return values;
}

/**
 * Assemble le questionnaire complet depuis la base.
 *
 * La question d'ouverture n'est pas stockée : elle est fabriquée à partir des
 * types de projet, pour que le prix de base d'un type ne se règle qu'à un seul
 * endroit. Elle est toujours posée en tête de la première étape.
 */
function load() {
  const { funnelSpreadLow, funnelSpreadHigh } = pricing();
  const range = (reference) => [
    Math.round(reference * funnelSpreadLow),
    Math.round(reference * funnelSpreadHigh)
  ];

  const types = typeQueries.all();
  const optionsByQuestion = new Map();
  for (const option of optionQueries.all()) {
    if (!optionsByQuestion.has(option.questionId)) optionsByQuestion.set(option.questionId, []);
    optionsByQuestion.get(option.questionId).push({
      value: option.value,
      label: option.label,
      help: option.help,
      icon: option.icon,
      price: range(option.price),
      factor: option.factor,
      monthly: [option.monthlyMin, option.monthlyMax]
    });
  }

  const typeQuestion = {
    id: "type",
    key: "type",
    type: "cards",
    label: "Type de projet",
    help: "",
    required: true,
    showFor: [],
    config: {},
    options: types.map((type) => ({
      value: type.slug,
      label: type.label,
      help: type.tagline,
      icon: type.icon,
      price: range(type.basePrice),
      factor: 1,
      monthly: [0, 0]
    }))
  };

  const questionsByStep = new Map();
  for (const row of questionQueries.all()) {
    const question = {
      id: row.id,
      key: row.qkey,
      type: row.type,
      label: row.label,
      help: row.help,
      required: Boolean(row.required),
      showFor: row.showFor,
      config: row.config,
      options: optionsByQuestion.get(row.id) || []
    };
    // Un champ nombre facture chaque unité au-delà de celles comprises
    if (row.type === "number") {
      question.perUnit = range(row.config.perUnit || 0);
    }
    if (!questionsByStep.has(row.stepId)) questionsByStep.set(row.stepId, []);
    questionsByStep.get(row.stepId).push(question);
  }

  const steps = stepQueries.all().map((step, index) => ({
    id: step.id,
    title: step.title,
    shortLabel: step.shortLabel || `Étape ${index + 1}`,
    description: step.description,
    questions: index === 0
      ? [typeQuestion, ...(questionsByStep.get(step.id) || [])]
      : questionsByStep.get(step.id) || []
  }));

  const questions = steps.flatMap((step) => step.questions);
  return { steps, questions, types, typeSlugs: types.map((t) => t.slug) };
}

/** Une question ne compte que si elle concerne le type de projet retenu. */
function appliesTo(question, type) {
  return question.showFor.length === 0 || question.showFor.includes(type);
}

// ── Calcul de l'estimation ──────────────────────────────────────────────────
// Un montant à 50 € près n'a pas de sens passé quelques milliers d'euros :
// l'arrondi s'élargit avec le total pour rester lisible
const roundPrice = (n) => (n < 10000 ? Math.round(n / 50) * 50 : Math.round(n / 500) * 500);

/**
 * Recalcule l'estimation à partir des réponses. Seul ce résultat fait foi :
 * l'affichage en direct côté client n'est qu'un aperçu.
 *
 * @returns {{min:number,max:number,factor:number,monthly:number[],weeks:number[],breakdown:Array}|null}
 */
function estimate(answers, funnel = load()) {
  const type = String(answers.type || "");
  const projectType = funnel.types.find((t) => t.slug === type);
  if (!projectType) return null;

  const breakdown = [];
  let min = 0;
  let max = 0;
  let factor = 1;
  let monthly = [0, 0];

  const add = (label, price) => {
    if (!price || (price[0] === 0 && price[1] === 0)) return;
    min += price[0];
    max += price[1];
    breakdown.push({ label, min: price[0], max: price[1] });
  };

  for (const question of funnel.questions) {
    if (!appliesTo(question, type)) continue;
    const answer = answers[question.key];

    if (question.type === "number") {
      const quantity = Number(answer);
      if (!Number.isFinite(quantity)) continue;
      const included = Number(question.config.included) || 0;
      const ceiling = Number(question.config.max) || quantity;
      const extra = Math.max(0, Math.min(quantity, ceiling) - included);
      if (extra > 0) {
        add(`${question.label} : ${extra} au-delà de ${included}`, [
          extra * question.perUnit[0],
          extra * question.perUnit[1]
        ]);
      }
      continue;
    }

    if (question.type === "checkbox") {
      const selected = Array.isArray(answer) ? answer : [answer].filter(Boolean);
      for (const option of question.options) {
        if (selected.includes(option.value)) add(option.label, option.price);
      }
      continue;
    }

    if (CHOICE_TYPES.includes(question.type) || question.type === "cards") {
      const option = question.options.find((o) => o.value === answer);
      if (!option) continue;
      add(option.label, option.price);
      if (option.factor) factor *= option.factor;
      if (option.monthly[1] > 0) monthly = option.monthly;
    }
  }

  min = roundPrice(min * factor);
  max = roundPrice(max * factor);

  // Délai indicatif déduit du budget médian. Les bornes évitent les extrêmes
  // absurdes : jamais moins de 2 semaines, jamais plus d'un an
  const { funnelWeeksLowDivisor, funnelWeeksHighDivisor } = pricing();
  const middle = (min + max) / 2;
  const weeksMin = Math.max(2, Math.min(40, Math.round(middle / funnelWeeksLowDivisor)));
  const weeksMax = Math.max(weeksMin + 2, Math.min(56, Math.round(middle / funnelWeeksHighDivisor)));

  // Le produit de plusieurs coefficients traîne des décimales binaires
  // (1.5 × 1.2 = 1.7999…) : inutile de les afficher
  return {
    min,
    max,
    factor: Math.round(factor * 100) / 100,
    monthly,
    weeks: [weeksMin, weeksMax],
    breakdown
  };
}

// ── Validation & lecture des réponses ───────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Nettoie et valide les réponses reçues du formulaire.
 * @returns {{errors:object, data:object}}
 */
function parseAnswers(body, funnel = load()) {
  const errors = {};
  const data = {};

  const type = String(body.type || "").trim();
  if (!funnel.typeSlugs.includes(type)) {
    errors.type = "Choisissez un type de projet.";
    return { errors, data };
  }
  data.type = type;

  for (const question of funnel.questions) {
    if (question.key === "type" || !appliesTo(question, type)) continue;
    const raw = body[question.key];

    if (question.type === "checkbox") {
      data[question.key] = (Array.isArray(raw) ? raw : [raw])
        .map((v) => String(v || "").trim())
        .filter((v) => question.options.some((o) => o.value === v));
      continue;
    }

    if (CHOICE_TYPES.includes(question.type)) {
      const value = String(raw || "").trim();
      if (!question.options.some((o) => o.value === value)) {
        if (question.required) errors[question.key] = "Cette réponse est obligatoire.";
        continue;
      }
      data[question.key] = value;
      continue;
    }

    if (question.type === "number") {
      const floor = Number(question.config.min) || 0;
      const ceiling = Number(question.config.max) || 9999;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < floor || value > ceiling) {
        errors[question.key] = `Indiquez un nombre entre ${floor} et ${ceiling}.`;
        continue;
      }
      data[question.key] = Math.round(value);
      continue;
    }

    if (FREE_TEXT_TYPES.includes(question.type)) {
      const maxLength = Number(question.config.maxLength) || 3000;
      const value = String(raw || "").trim();
      if (!value) {
        if (question.required) errors[question.key] = "Ce champ est obligatoire.";
        continue;
      }
      if (value.length > maxLength) {
        errors[question.key] = `Ce champ est limité à ${maxLength} caractères.`;
        continue;
      }
      if (question.type === "email" && !EMAIL_REGEX.test(value)) {
        errors[question.key] = "L'adresse e-mail n'est pas valide.";
        continue;
      }
      data[question.key] = value;
    }
  }

  return { errors, data };
}

/**
 * Traduit les réponses en libellés lisibles, pour l'affichage dans /admin.
 * Les questions supprimées depuis l'envoi sont simplement ignorées.
 * @returns {Array<{label:string, value:string}>}
 */
function summarize(answers, funnel = load()) {
  const type = String(answers.type || "");
  const lines = [];

  for (const question of funnel.questions) {
    if (!appliesTo(question, type)) continue;
    const answer = answers[question.key];
    if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) continue;

    if (question.type === "checkbox") {
      const labels = question.options.filter((o) => answer.includes(o.value)).map((o) => o.label);
      if (labels.length > 0) lines.push({ label: question.label, value: labels.join(", ") });
      continue;
    }

    if (CHOICE_TYPES.includes(question.type) || question.type === "cards") {
      const option = question.options.find((o) => o.value === answer);
      if (option) lines.push({ label: question.label, value: option.label });
      continue;
    }

    lines.push({ label: question.label, value: String(answer) });
  }

  return lines;
}

module.exports = {
  load,
  estimate,
  parseAnswers,
  summarize,
  pricing,
  QUESTION_TYPES,
  CHOICE_TYPES,
  FREE_TEXT_TYPES,
  PRICING_SETTINGS
};
