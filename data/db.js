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
`);

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

module.exports = { db, projectQueries, contactQueries, settingQueries, messageQueries };
