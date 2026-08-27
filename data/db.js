// Couche d'accès à la base SQLite (projets, contacts, messages).
// La base est créée automatiquement au premier lancement, puis remplie
// avec les données de démarrage de data/seed.js si elle est vide.

const path = require("path");
const Database = require("better-sqlite3");

const {
  projects: seedProjects,
  contacts: seedContacts,
  settings: seedSettings
} = require("./seed");

// Le contenu du tunnel vit dans lib/ : data/ est masqué par un volume Docker
const funnelSeed = require("../lib/funnel-seed");

const db = new Database(path.join(__dirname, "milym.db"));
db.pragma("journal_mode = WAL");

// ── Schéma ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    technologies TEXT NOT NULL DEFAULT '[]',
    projectUrl TEXT NOT NULL DEFAULT '',
    githubUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Demandes issues du tunnel « Créer mon projet » (voir lib/funnel.js).
  -- answers contient l'intégralité du questionnaire au format JSON.
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    details TEXT,
    answers TEXT NOT NULL DEFAULT '{}',
    estimateMin INTEGER NOT NULL DEFAULT 0,
    estimateMax INTEGER NOT NULL DEFAULT 0,
    monthlyMin INTEGER NOT NULL DEFAULT 0,
    monthlyMax INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- ── Contenu du tunnel, entièrement modifiable depuis /admin/tunnel ────────
  -- shortLabel : nom du jalon dans la frise de progression, où la place manque
  CREATE TABLE IF NOT EXISTS funnel_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    shortLabel TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );

  -- Les types alimentent la question d'ouverture et donnent son prix de base
  CREATE TABLE IF NOT EXISTS funnel_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'etincelles',
    basePrice INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );

  -- showFor : tableau JSON de slugs de types ; vide = question posée à tous.
  -- config  : tableau JSON des réglages propres au type de champ (nombre de
  --           pages, longueur maximale d'un texte…)
  CREATE TABLE IF NOT EXISTS funnel_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stepId INTEGER NOT NULL REFERENCES funnel_steps(id) ON DELETE CASCADE,
    qkey TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    help TEXT NOT NULL DEFAULT '',
    required INTEGER NOT NULL DEFAULT 0,
    showFor TEXT NOT NULL DEFAULT '[]',
    config TEXT NOT NULL DEFAULT '{}',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS funnel_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionId INTEGER NOT NULL REFERENCES funnel_questions(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    help TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'etincelles',
    price INTEGER NOT NULL DEFAULT 0,
    factor REAL NOT NULL DEFAULT 1,
    monthlyMin INTEGER NOT NULL DEFAULT 0,
    monthlyMax INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );
`);

// Les suppressions en cascade ne s'appliquent que si les clés sont activées
db.pragma("foreign_keys = ON");

// ── Données de démarrage ────────────────────────────────────────────────────
const projectCount = db.prepare("SELECT COUNT(*) AS n FROM projects").get().n;
if (projectCount === 0) {
  const insert = db.prepare(`
    INSERT INTO projects (title, slug, description, image, category, technologies, projectUrl, githubUrl)
    VALUES (@title, @slug, @description, @image, @category, @technologies, @projectUrl, @githubUrl)
  `);
  for (const p of seedProjects) {
    insert.run({ ...p, technologies: JSON.stringify(p.technologies), githubUrl: p.githubUrl || null });
  }
}

const contactCount = db.prepare("SELECT COUNT(*) AS n FROM contacts").get().n;
if (contactCount === 0) {
  const insert = db.prepare("INSERT INTO contacts (kind, label, value) VALUES (@kind, @label, @value)");
  for (const c of seedContacts) insert.run(c);
}

// Les réglages manquants sont ajoutés sans écraser ceux déjà personnalisés
{
  const insert = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(seedSettings)) insert.run(key, value);

  // Anciens textes du tunnel qui affichaient encore une estimation chiffrée
  const currentSettings = Object.fromEntries(
    db.prepare("SELECT key, value FROM settings").all().map((row) => [row.key, row.value])
  );
  const retiredCopy = {
    funnelIntro:
      "Quelques questions pour cerner votre besoin, et vous repartez avec une estimation de budget et de délai. Comptez trois minutes, sans engagement.",
    funnelResultLabel: "Estimation",
    funnelResultTitle: "Votre estimation",
    funnelResultIntro: "Demande reçue, merci. Voici la fourchette calculée à partir de vos réponses.",
    funnelDisclaimer:
      "Cette estimation est indicative et ne vaut pas devis. Je reviens vers vous sous 48 heures avec une proposition chiffrée précise après un échange."
  };
  const updateSetting = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
  for (const [key, previous] of Object.entries(retiredCopy)) {
    if (currentSettings[key] === previous) updateSetting.run(seedSettings[key], key);
  }

  const retiredSteps = [
    ["Plus vous êtes précis, plus l'estimation sera juste.", "Plus vous êtes précis, plus je pourrai cibler la proposition."],
    ["Les derniers éléments qui pèsent sur le budget.", "Les derniers éléments qui cadrent le lancement."],
    ["Où vous envoyer l'estimation ?", "Où vous recontacter ?"]
  ];
  const updateStepDescription = db.prepare("UPDATE funnel_steps SET description = ? WHERE description = ?");
  const updateStepTitle = db.prepare("UPDATE funnel_steps SET title = ? WHERE title = ?");
  updateStepDescription.run(retiredSteps[0][1], retiredSteps[0][0]);
  updateStepDescription.run(retiredSteps[1][1], retiredSteps[1][0]);
  updateStepTitle.run(retiredSteps[2][1], retiredSteps[2][0]);
}

// Contenu du tunnel : posé une seule fois, puis géré depuis /admin/tunnel
const stepCount = db.prepare("SELECT COUNT(*) AS n FROM funnel_steps").get().n;
if (stepCount === 0) {
  const insertStep = db.prepare(
    "INSERT INTO funnel_steps (title, shortLabel, description, position) VALUES (?, ?, ?, ?)"
  );
  const insertType = db.prepare(`
    INSERT INTO funnel_types (slug, label, tagline, icon, basePrice, position)
    VALUES (@slug, @label, @tagline, @icon, @basePrice, @position)
  `);
  const insertQuestion = db.prepare(`
    INSERT INTO funnel_questions (stepId, qkey, type, label, help, required, showFor, config, position)
    VALUES (@stepId, @qkey, @type, @label, @help, @required, @showFor, @config, @position)
  `);
  const insertOption = db.prepare(`
    INSERT INTO funnel_options (questionId, value, label, help, icon, price, factor, monthlyMin, monthlyMax, position)
    VALUES (@questionId, @value, @label, @help, @icon, @price, @factor, @monthlyMin, @monthlyMax, @position)
  `);

  db.transaction(() => {
    const stepIds = {};
    funnelSeed.steps.forEach((step, i) => {
      stepIds[step.key] = insertStep.run(step.title, step.shortLabel, step.description, i).lastInsertRowid;
    });

    funnelSeed.types.forEach((type, i) => insertType.run({ ...type, position: i }));

    funnelSeed.questions.forEach((question, i) => {
      const questionId = insertQuestion.run({
        stepId: stepIds[question.step],
        qkey: question.key,
        type: question.type,
        label: question.label,
        help: question.help || "",
        required: question.required || 0,
        showFor: JSON.stringify(question.showFor || []),
        config: JSON.stringify(question.config || {}),
        position: i
      }).lastInsertRowid;

      (question.options || []).forEach((option, j) => {
        insertOption.run({
          questionId,
          value: option.value,
          label: option.label,
          help: option.help || "",
          icon: option.icon || "etincelles",
          price: option.price || 0,
          factor: option.factor || 1,
          monthlyMin: option.monthlyMin || 0,
          monthlyMax: option.monthlyMax || 0,
          position: j
        });
      });
    });
  })();
}

// ── Projets ─────────────────────────────────────────────────────────────────
function parseProject(row) {
  return row ? { ...row, technologies: JSON.parse(row.technologies) } : null;
}

const projectQueries = {
  all: () => db.prepare("SELECT * FROM projects ORDER BY id").all().map(parseProject),
  get: (id) => parseProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(id)),
  create: (p) =>
    db.prepare(`
      INSERT INTO projects (title, slug, description, image, category, technologies, projectUrl, githubUrl)
      VALUES (@title, @slug, @description, @image, @category, @technologies, @projectUrl, @githubUrl)
    `).run({ ...p, technologies: JSON.stringify(p.technologies) }),
  update: (id, p) =>
    db.prepare(`
      UPDATE projects
      SET title = @title, slug = @slug, description = @description, image = @image,
          category = @category, technologies = @technologies, projectUrl = @projectUrl, githubUrl = @githubUrl
      WHERE id = @id
    `).run({ ...p, id, technologies: JSON.stringify(p.technologies) }),
  remove: (id) => db.prepare("DELETE FROM projects WHERE id = ?").run(id)
};

// ── Contacts ────────────────────────────────────────────────────────────────
const contactQueries = {
  all: () => db.prepare("SELECT * FROM contacts ORDER BY id").all(),
  get: (id) => db.prepare("SELECT * FROM contacts WHERE id = ?").get(id),
  create: (c) => db.prepare("INSERT INTO contacts (kind, label, value) VALUES (@kind, @label, @value)").run(c),
  update: (id, c) =>
    db.prepare("UPDATE contacts SET kind = @kind, label = @label, value = @value WHERE id = @id").run({ ...c, id }),
  remove: (id) => db.prepare("DELETE FROM contacts WHERE id = ?").run(id)
};

// ── Réglages du site ────────────────────────────────────────────────────────
const settingQueries = {
  all: () =>
    Object.fromEntries(db.prepare("SELECT key, value FROM settings").all().map((r) => [r.key, r.value])),
  set: (key, value) =>
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value)
};

// ── Messages du formulaire de contact ───────────────────────────────────────
const messageQueries = {
  all: () => db.prepare("SELECT * FROM messages ORDER BY id DESC").all(),
  count: () => db.prepare("SELECT COUNT(*) AS n FROM messages").get().n,
  create: (m) =>
    db.prepare("INSERT INTO messages (name, email, subject, message) VALUES (@name, @email, @subject, @message)").run(m),
  remove: (id) => db.prepare("DELETE FROM messages WHERE id = ?").run(id)
};

// ── Demandes de devis (tunnel « Créer mon projet ») ─────────────────────────
function parseLead(row) {
  return row ? { ...row, answers: JSON.parse(row.answers) } : null;
}

const leadQueries = {
  all: () => db.prepare("SELECT * FROM leads ORDER BY id DESC").all().map(parseLead),
  count: () => db.prepare("SELECT COUNT(*) AS n FROM leads").get().n,
  create: (lead) =>
    db.prepare(`
      INSERT INTO leads (type, name, email, company, phone, details, answers,
                         estimateMin, estimateMax, monthlyMin, monthlyMax)
      VALUES (@type, @name, @email, @company, @phone, @details, @answers,
              @estimateMin, @estimateMax, @monthlyMin, @monthlyMax)
    `).run({ ...lead, answers: JSON.stringify(lead.answers) }),
  remove: (id) => db.prepare("DELETE FROM leads WHERE id = ?").run(id)
};

// ── Contenu du tunnel ───────────────────────────────────────────────────────
// Chaque table est triée par `position` : c'est l'ordre d'affichage, réglable
// depuis /admin/tunnel.
function parseQuestion(row) {
  return row ? { ...row, showFor: JSON.parse(row.showFor), config: JSON.parse(row.config) } : null;
}

const stepQueries = {
  all: () => db.prepare("SELECT * FROM funnel_steps ORDER BY position, id").all(),
  get: (id) => db.prepare("SELECT * FROM funnel_steps WHERE id = ?").get(id),
  create: (s) =>
    db.prepare(`
      INSERT INTO funnel_steps (title, shortLabel, description, position)
      VALUES (@title, @shortLabel, @description, @position)
    `).run(s),
  update: (id, s) =>
    db.prepare(`
      UPDATE funnel_steps
      SET title = @title, shortLabel = @shortLabel, description = @description, position = @position
      WHERE id = @id
    `).run({ ...s, id }),
  remove: (id) => db.prepare("DELETE FROM funnel_steps WHERE id = ?").run(id)
};

const typeQueries = {
  all: () => db.prepare("SELECT * FROM funnel_types ORDER BY position, id").all(),
  get: (id) => db.prepare("SELECT * FROM funnel_types WHERE id = ?").get(id),
  create: (t) =>
    db.prepare(`
      INSERT INTO funnel_types (slug, label, tagline, icon, basePrice, position)
      VALUES (@slug, @label, @tagline, @icon, @basePrice, @position)
    `).run(t),
  update: (id, t) =>
    db.prepare(`
      UPDATE funnel_types
      SET slug = @slug, label = @label, tagline = @tagline, icon = @icon,
          basePrice = @basePrice, position = @position
      WHERE id = @id
    `).run({ ...t, id }),
  remove: (id) => db.prepare("DELETE FROM funnel_types WHERE id = ?").run(id)
};

const questionQueries = {
  all: () => db.prepare("SELECT * FROM funnel_questions ORDER BY position, id").all().map(parseQuestion),
  get: (id) => parseQuestion(db.prepare("SELECT * FROM funnel_questions WHERE id = ?").get(id)),
  create: (q) =>
    db.prepare(`
      INSERT INTO funnel_questions (stepId, qkey, type, label, help, required, showFor, config, position)
      VALUES (@stepId, @qkey, @type, @label, @help, @required, @showFor, @config, @position)
    `).run({ ...q, showFor: JSON.stringify(q.showFor), config: JSON.stringify(q.config) }),
  update: (id, q) =>
    db.prepare(`
      UPDATE funnel_questions
      SET stepId = @stepId, qkey = @qkey, type = @type, label = @label, help = @help,
          required = @required, showFor = @showFor, config = @config, position = @position
      WHERE id = @id
    `).run({ ...q, id, showFor: JSON.stringify(q.showFor), config: JSON.stringify(q.config) }),
  remove: (id) => db.prepare("DELETE FROM funnel_questions WHERE id = ?").run(id)
};

const optionQueries = {
  all: () => db.prepare("SELECT * FROM funnel_options ORDER BY position, id").all(),
  forQuestion: (questionId) =>
    db.prepare("SELECT * FROM funnel_options WHERE questionId = ? ORDER BY position, id").all(questionId),
  create: (o) =>
    db.prepare(`
      INSERT INTO funnel_options (questionId, value, label, help, icon, price, factor, monthlyMin, monthlyMax, position)
      VALUES (@questionId, @value, @label, @help, @icon, @price, @factor, @monthlyMin, @monthlyMax, @position)
    `).run(o),
  // Les réponses sont éditées en bloc depuis le formulaire de la question :
  // on remplace la liste entière plutôt que de suivre chaque ligne
  replaceAll: db.transaction((questionId, options) => {
    db.prepare("DELETE FROM funnel_options WHERE questionId = ?").run(questionId);
    options.forEach((option, i) => optionQueries.create({ ...option, questionId, position: i }));
  })
};

module.exports = {
  db,
  projectQueries,
  contactQueries,
  settingQueries,
  messageQueries,
  leadQueries,
  stepQueries,
  typeQueries,
  questionQueries,
  optionQueries
};
