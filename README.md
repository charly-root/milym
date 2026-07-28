# milym

Portfolio personnel sombre, futuriste et minimaliste, construit avec Node.js, Express, EJS et Tailwind CSS. Les projets, les contacts et les messages reçus sont stockés dans une base SQLite et gérés depuis un centre de contrôle intégré.

## Aperçu

- Page d'accueil immersive **sans barre de navigation** : uniquement le panneau en verre 3D réagissant à la souris
- Page projets avec grille responsive, filtres par catégorie et badges technologies
- Page contact générée dynamiquement (blocs cliquables, copie d'e-mail, formulaire validé côté client **et** serveur)
- **Centre de contrôle `/admin`** protégé par mot de passe : logo et contenu de la page d'accueil, ajout / modification / suppression des projets et des contacts, consultation des messages reçus
- Base de données **SQLite** (`better-sqlite3`), créée et remplie automatiquement au premier lancement
- Sécurité : `helmet`, `express-rate-limit` (formulaire + connexion admin), sessions, limitation de la taille des requêtes, variables d'environnement

## Prérequis

- Node.js 18 ou supérieur
- npm

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier d'environnement puis définir ADMIN_PASSWORD et SESSION_SECRET
cp .env.example .env

# 3. Compiler le CSS Tailwind
npm run build:css
```

## Lancement

```bash
# Développement (redémarrage automatique avec nodemon)
npm run dev

# Production
npm start
```

Le site est accessible sur [http://localhost:3000](http://localhost:3000) et le centre de contrôle sur [http://localhost:3000/admin](http://localhost:3000/admin) (mot de passe : variable `ADMIN_PASSWORD` du fichier `.env`).

Pendant le développement, pour recompiler le CSS à chaque modification :

```bash
npm run watch:css
```

## Structure du projet

```text
├── app.js                  # Point d'entrée Express (sécurité, sessions, EJS, statiques)
├── routes/
│   ├── main.js             # Routes publiques : / , /projets , /contact (GET + POST)
│   └── admin.js            # Centre de contrôle : login + CRUD projets/contacts + messages
├── data/
│   ├── db.js               # Base SQLite : schéma, seed et requêtes
│   ├── seed.js             # Données de démarrage (insérées si la base est vide)
│   └── milym.db            # Base de données (générée, ignorée par git)
├── views/
│   ├── index.ejs           # Accueil (panneau en verre 3D, sans navigation)
│   ├── projects.ejs        # Grille de projets avec filtres
│   ├── contact.ejs         # Blocs de contact dynamiques + formulaire
│   ├── 404.ejs             # Page introuvable
│   ├── admin/              # Vues du centre de contrôle
│   │   ├── login.ejs
│   │   ├── projects.ejs / project-form.ejs
│   │   ├── contacts.ejs / contact-form.ejs
│   │   └── messages.ejs
│   └── partials/
│       ├── header.ejs / footer.ejs          # Site public
│       └── admin-header.ejs / admin-footer.ejs
├── public/
│   ├── css/output.css      # CSS compilé (généré, ne pas éditer)
│   ├── js/main.js          # Interactions du site public
│   ├── js/admin.js         # Confirmations de suppression dans l'admin
│   ├── images/             # Images des projets
│   └── logos/logo.svg      # Logo du site
├── src/
│   └── input.css           # Source Tailwind (classes réutilisables)
├── scripts/
│   └── generate-images.js  # Génère des images SVG de remplacement
└── tailwind.config.js      # Couleurs, ombres et animations personnalisées
```

## Centre de contrôle

Accessible sur `/admin` après connexion :

- **Accueil** : logo du site (upload SVG, PNG, JPG ou WebP — 2 Mo max), nom du site, titre et phrase du panneau central, texte À propos et les trois statistiques. L'ancien logo uploadé est supprimé automatiquement lors d'un remplacement.
- **Projets** : liste, ajout, modification, suppression. Le slug est généré automatiquement depuis le titre si laissé vide. Les technologies se saisissent séparées par des virgules.
- **Contacts** : blocs affichés sur la page `/contact` et icônes du footer. Types disponibles : `phone` (lien d'appel), `email` (mailto + bouton copier), `github`, `linkedin`, `lien` (lien externe générique).
- **Messages** : tous les messages envoyés via le formulaire de contact, avec suppression possible.

La base `data/milym.db` est créée au premier lancement et remplie avec les données d'exemple de `data/seed.js` uniquement si elle est vide.

## Personnalisation

- **Mot de passe admin et secret de session** : fichier `.env` (`ADMIN_PASSWORD`, `SESSION_SECRET`)
- **Couleurs** : `tailwind.config.js`, puis recompiler avec `npm run build:css`
- **Images des projets** : déposer les fichiers dans `public/images/` puis renseigner le chemin dans le formulaire admin

## Notes

- Les images des projets d'exemple sont des SVG générés par `node scripts/generate-images.js`. Remplacez-les par de vraies captures d'écran.
- Les messages du formulaire sont enregistrés en base et consultables dans `/admin/messages`. Brancher un service d'envoi d'e-mails (Nodemailer, Resend...) dans `routes/main.js` si besoin de notifications.
- Les animations respectent `prefers-reduced-motion` et l'effet 3D est désactivé sur les écrans tactiles.
