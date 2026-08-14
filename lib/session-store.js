// Magasin de sessions adossé à la base SQLite du site.
//
// Sans lui, express-session garde les sessions en mémoire : chaque
// redéploiement déconnecte le centre de contrôle. Les sessions vivent
// désormais dans milym.db, donc dans le volume Docker.
//
// better-sqlite3 étant synchrone, chaque méthode répond immédiatement et
// n'utilise le callback que pour respecter l'interface d'express-session.

const session = require("express-session");

// Fréquence du ménage des sessions périmées
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

/**
 * @param {import("better-sqlite3").Database} db connexion partagée avec le site
 * @returns {session.Store}
 */
function createSessionStore(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      expires INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expires ON sessions (expires);
  `);

  const statements = {
    get: db.prepare("SELECT data FROM sessions WHERE sid = ? AND expires > ?"),
    set: db.prepare(`
      INSERT INTO sessions (sid, expires, data) VALUES (@sid, @expires, @data)
      ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data
    `),
    touch: db.prepare("UPDATE sessions SET expires = ? WHERE sid = ?"),
    destroy: db.prepare("DELETE FROM sessions WHERE sid = ?"),
    sweep: db.prepare("DELETE FROM sessions WHERE expires <= ?"),
    count: db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE expires > ?"),
    all: db.prepare("SELECT data FROM sessions WHERE expires > ?"),
    clear: db.prepare("DELETE FROM sessions")
  };

  const now = () => Date.now();

  /** Date de péremption portée par le cookie, sinon dans quatre heures. */
  const expiryOf = (sess) => {
    const cookie = sess && sess.cookie;
    if (cookie) {
      if (cookie.expires) return new Date(cookie.expires).getTime();
      if (cookie.maxAge) return now() + cookie.maxAge;
    }
    return now() + 4 * 60 * 60 * 1000;
  };

  class SqliteStore extends session.Store {
    get(sid, callback) {
      try {
        const row = statements.get.get(sid, now());
        // Session absente ou périmée : express-session en ouvrira une neuve
        callback(null, row ? JSON.parse(row.data) : null);
      } catch (error) {
        callback(error);
      }
    }

    set(sid, sess, callback) {
      try {
        statements.set.run({ sid, expires: expiryOf(sess), data: JSON.stringify(sess) });
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    // Appelée à chaque requête d'une session déjà connue : seule la date de
    // péremption bouge, ce qui évite de réécrire les données à l'identique
    touch(sid, sess, callback) {
      try {
        statements.touch.run(expiryOf(sess), sid);
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    destroy(sid, callback) {
      try {
        statements.destroy.run(sid);
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    length(callback) {
      try {
        callback(null, statements.count.get(now()).n);
      } catch (error) {
        callback(error);
      }
    }

    all(callback) {
      try {
        callback(null, statements.all.all(now()).map((row) => JSON.parse(row.data)));
      } catch (error) {
        callback(error);
      }
    }

    clear(callback) {
      try {
        statements.clear.run();
        callback(null);
      } catch (error) {
        callback(error);
      }
    }
  }

  // Les sessions expirées ne sont jamais relues, mais elles s'accumuleraient
  // sans ce ménage. `unref` laisse le processus s'arrêter normalement.
  statements.sweep.run(now());
  setInterval(() => statements.sweep.run(now()), SWEEP_INTERVAL_MS).unref();

  return new SqliteStore();
}

module.exports = { createSessionStore };
