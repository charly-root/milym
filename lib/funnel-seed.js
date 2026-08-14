// Contenu de départ du tunnel « Créer mon projet ».
//
// Il n'est inséré qu'une fois, à la création de la base. Ensuite tout se
// modifie depuis /admin/tunnel : étapes, types de projet, questions, réponses,
// tarifs et icônes. Ne rien changer ici pour éditer un site déjà en service.
//
// Les prix sont des références en euros HT ; la fourchette affichée les encadre
// selon les coefficients réglables dans /admin/tunnel/reglages.

// La première étape est réservée au choix du type de projet : la question
// correspondante est fabriquée à partir de la table des types (voir funnel.js).
const steps = [
  {
    key: "projet",
    title: "Quel projet voulez-vous lancer ?",
    shortLabel: "Projet",
    description: "Le reste du questionnaire s'adapte à votre choix."
  },
  {
    key: "perimetre",
    title: "Précisons le périmètre",
    shortLabel: "Périmètre",
    description: "Plus vous êtes précis, plus l'estimation sera juste."
  },
  {
    key: "lancement",
    title: "Mise en ligne et suivi",
    shortLabel: "Lancement",
    description: "Les derniers éléments qui pèsent sur le budget."
  },
  {
    key: "coordonnees",
    title: "Où vous envoyer l'estimation ?",
    shortLabel: "Contact",
    description: "Je reviens vers vous sous 48 heures avec une proposition détaillée."
  }
];

const types = [
  {
    slug: "vitrine",
    label: "Site vitrine",
    tagline: "Présenter votre activité et être trouvé sur Google",
    icon: "globe",
    basePrice: 1800
  },
  {
    slug: "ecommerce",
    label: "Boutique en ligne",
    tagline: "Vendre vos produits avec WordPress et WooCommerce",
    icon: "panier",
    basePrice: 4000
  },
  {
    slug: "surmesure",
    label: "Site sur mesure",
    tagline: "Une expérience unique : 3D, animations, direction artistique",
    icon: "cube",
    basePrice: 8000
  },
  {
    slug: "logiciel",
    label: "Logiciel métier",
    tagline: "Un outil taillé pour vos équipes et vos processus",
    icon: "engrenage",
    basePrice: 12000
  }
];

const questions = [
  // ── Périmètre : commun à tous les types ────────────────────────────────────
  {
    step: "perimetre",
    key: "origin",
    type: "radio",
    label: "Partez-vous de zéro ?",
    required: 1,
    showFor: [],
    options: [
      { value: "nouveau", label: "Nouveau projet", icon: "fusee", price: 0 },
      {
        value: "refonte",
        label: "Refonte d'un projet existant",
        help: "Reprise des contenus et redirections à prévoir",
        icon: "cle",
        price: 320
      }
    ]
  },
  {
    step: "perimetre",
    key: "brand",
    type: "radio",
    label: "Où en êtes-vous de votre identité visuelle ?",
    required: 1,
    showFor: [],
    options: [
      { value: "complete", label: "J'ai une charte graphique complète", icon: "bouclier", price: 0 },
      { value: "logo", label: "J'ai seulement un logo", icon: "palette", price: 480 },
      { value: "rien", label: "Tout est à créer", icon: "etincelles", price: 1300 }
    ]
  },

  // ── Site vitrine ───────────────────────────────────────────────────────────
  {
    step: "perimetre",
    key: "pages",
    type: "number",
    label: "Combien de pages environ ?",
    help: "Accueil, services, à propos, contact… les 3 premières sont comprises.",
    showFor: ["vitrine"],
    config: { min: 1, max: 60, default: 5, included: 3, perUnit: 140 }
  },
  {
    step: "perimetre",
    key: "vitrineOptions",
    type: "checkbox",
    label: "Fonctionnalités souhaitées",
    showFor: ["vitrine"],
    options: [
      { value: "blog", label: "Blog ou fil d'actualités", icon: "document", price: 600 },
      { value: "rdv", label: "Prise de rendez-vous en ligne", icon: "calendrier", price: 800 },
      { value: "membres", label: "Espace membres protégé", icon: "cadenas", price: 1350 },
      { value: "multisite", label: "Plusieurs établissements ou points de vente", icon: "batiment", price: 450 },
      { value: "redaction", label: "Rédaction des textes par mes soins", icon: "livre", price: 650 },
      { value: "langues", label: "Site multilingue", icon: "globe", price: 1000 }
    ]
  },

  // ── Boutique en ligne ──────────────────────────────────────────────────────
  {
    step: "perimetre",
    key: "products",
    type: "radio",
    label: "Combien de produits à vendre ?",
    required: 1,
    showFor: ["ecommerce"],
    options: [
      { value: "1-20", label: "1 à 20 produits", icon: "boite", price: 0 },
      { value: "21-100", label: "21 à 100 produits", icon: "boite", price: 500 },
      { value: "101-500", label: "101 à 500 produits", icon: "donnees", price: 1250 },
      { value: "500+", label: "Plus de 500 produits", icon: "donnees", price: 2600 }
    ]
  },
  {
    step: "perimetre",
    key: "ecommerceOptions",
    type: "checkbox",
    label: "Fonctionnalités de la boutique",
    showFor: ["ecommerce"],
    options: [
      { value: "paiement", label: "Paiement en ligne (Stripe, PayPal)", icon: "carte", price: 400 },
      { value: "stocks", label: "Gestion des stocks et alertes", icon: "boite", price: 680 },
      { value: "livraison", label: "Transporteurs et suivi de livraison", icon: "camion", price: 680 },
      { value: "abonnement", label: "Abonnements ou paiement récurrent", icon: "euro", price: 1150 },
      { value: "devises", label: "Multi-devises et multilingue", icon: "globe", price: 1050 },
      { value: "migration", label: "Migration d'un catalogue existant", icon: "donnees", price: 880 },
      { value: "marketplace", label: "Place de marché multi-vendeurs", icon: "batiment", price: 2900 },
      { value: "fidelite", label: "Codes promo et programme de fidélité", icon: "etoile", price: 580 }
    ]
  },

  // ── Site sur mesure ────────────────────────────────────────────────────────
  {
    step: "perimetre",
    key: "scenes3d",
    type: "radio",
    label: "Quelle place pour la 3D ?",
    required: 1,
    showFor: ["surmesure"],
    options: [
      { value: "aucune", label: "Pas de 3D, du design et des animations", icon: "palette", price: 0 },
      { value: "1-3", label: "1 à 3 scènes 3D interactives", icon: "cube", price: 2000 },
      { value: "4-10", label: "4 à 10 scènes 3D", icon: "cube", price: 4500 },
      {
        value: "configurateur",
        label: "Configurateur 3D complet",
        help: "Personnalisation du produit en temps réel",
        icon: "engrenage",
        price: 9500
      }
    ]
  },
  {
    step: "perimetre",
    key: "assets3d",
    type: "radio",
    label: "Les modèles 3D existent-ils déjà ?",
    required: 1,
    showFor: ["surmesure"],
    options: [
      { value: "fournis", label: "Je fournis les fichiers 3D", icon: "boite", price: 0 },
      { value: "acreer", label: "Ils sont à modéliser", icon: "cube", price: 2600 },
      { value: "sansobjet", label: "Sans objet, pas de 3D", icon: "etincelles", price: 0 }
    ]
  },
  {
    step: "perimetre",
    key: "surmesureOptions",
    type: "checkbox",
    label: "Ce qui rendra le projet unique",
    showFor: ["surmesure"],
    options: [
      { value: "scroll", label: "Animations avancées au défilement", icon: "etincelles", price: 1300 },
      { value: "da", label: "Direction artistique complète", icon: "palette", price: 2000 },
      { value: "motion", label: "Illustrations et motion design", icon: "etincelles", price: 1450 },
      { value: "son", label: "Habillage sonore et interactions audio", icon: "discussion", price: 850 },
      { value: "backoffice", label: "Back-office pour gérer les contenus", icon: "engrenage", price: 2400 },
      { value: "perf", label: "Optimisation performances et accessibilité poussée", icon: "eclair", price: 1150 }
    ]
  },

  // ── Logiciel métier ────────────────────────────────────────────────────────
  {
    step: "perimetre",
    key: "users",
    type: "radio",
    label: "Combien de salariés utiliseront le logiciel ?",
    help: "Le nombre d'utilisateurs détermine la robustesse et l'infrastructure nécessaires.",
    required: 1,
    showFor: ["logiciel"],
    options: [
      { value: "1-5", label: "1 à 5 salariés", icon: "equipe", factor: 1 },
      { value: "6-20", label: "6 à 20 salariés", icon: "equipe", factor: 1.15 },
      { value: "21-50", label: "21 à 50 salariés", icon: "equipe", factor: 1.3 },
      { value: "51-200", label: "51 à 200 salariés", icon: "batiment", factor: 1.5 },
      { value: "200+", label: "Plus de 200 salariés", icon: "batiment", factor: 1.75 }
    ]
  },
  {
    step: "perimetre",
    key: "deployment",
    type: "radio",
    label: "Qui utilisera le logiciel ?",
    required: 1,
    showFor: ["logiciel"],
    options: [
      { value: "interne", label: "Uniquement mes équipes", icon: "equipe", price: 0 },
      { value: "clients", label: "Mes équipes et mes clients", icon: "discussion", price: 2100 },
      { value: "saas", label: "Plusieurs entreprises clientes (SaaS)", icon: "nuage", price: 4200 }
    ]
  },
  {
    step: "perimetre",
    key: "modules",
    type: "checkbox",
    label: "Quels modules vous sont nécessaires ?",
    showFor: ["logiciel"],
    options: [
      { value: "crm", label: "Gestion des clients (CRM)", icon: "equipe", price: 1900 },
      { value: "facturation", label: "Devis et facturation", icon: "euro", price: 2200 },
      { value: "stocks", label: "Stocks et inventaire", icon: "boite", price: 2000 },
      { value: "planning", label: "Planning et réservations", icon: "calendrier", price: 2100 },
      { value: "rh", label: "RH, congés et temps de travail", icon: "equipe", price: 2300 },
      { value: "reporting", label: "Tableaux de bord et reporting", icon: "graphique", price: 1700 },
      { value: "documents", label: "Gestion documentaire et signatures", icon: "document", price: 2000 },
      { value: "production", label: "Suivi de production ou d'interventions", icon: "engrenage", price: 2450 },
      { value: "achats", label: "Achats et fournisseurs", icon: "camion", price: 1800 }
    ]
  },
  {
    step: "perimetre",
    key: "logicielOptions",
    type: "checkbox",
    label: "Contraintes techniques",
    showFor: ["logiciel"],
    options: [
      { value: "roles", label: "Rôles et permissions détaillés", icon: "cadenas", price: 1150 },
      { value: "mobile", label: "Application mobile iOS et Android", icon: "mobile", price: 5000 },
      { value: "api", label: "Connexion à vos outils existants (API)", icon: "lien", price: 2000 },
      { value: "migration", label: "Migration de vos données actuelles", icon: "donnees", price: 1550 },
      { value: "horsligne", label: "Fonctionnement hors connexion", icon: "nuage", price: 2450 },
      { value: "compta", label: "Export comptable ou EDI", icon: "euro", price: 1200 },
      { value: "sso", label: "Authentification unique (SSO)", icon: "cadenas", price: 1300 }
    ]
  },

  // ── Mise en ligne et suivi ─────────────────────────────────────────────────
  {
    step: "lancement",
    key: "deadline",
    type: "radio",
    label: "Pour quand ?",
    required: 1,
    showFor: [],
    options: [
      { value: "souple", label: "Je ne suis pas pressé", icon: "calendrier", factor: 1 },
      { value: "3mois", label: "Dans les 3 mois", icon: "calendrier", factor: 1 },
      { value: "urgent", label: "Sous 6 semaines", help: "Mobilisation renforcée", icon: "eclair", factor: 1.2 }
    ]
  },
  {
    step: "lancement",
    key: "hosting",
    type: "radio",
    label: "Hébergement et nom de domaine",
    required: 1,
    showFor: [],
    options: [
      { value: "existant", label: "Je les ai déjà", icon: "bouclier", price: 0 },
      { value: "amettre", label: "À mettre en place", icon: "nuage", price: 330 }
    ]
  },
  {
    step: "lancement",
    key: "seo",
    type: "radio",
    label: "Référencement naturel",
    required: 1,
    showFor: [],
    options: [
      { value: "non", label: "Pas maintenant", icon: "etincelles", price: 0 },
      { value: "base", label: "Bases techniques", icon: "loupe", price: 520 },
      {
        value: "avance",
        label: "Accompagnement avancé",
        help: "Recherche de mots-clés, contenus, suivi",
        icon: "graphique",
        price: 1550
      }
    ]
  },
  {
    step: "lancement",
    key: "extras",
    type: "checkbox",
    label: "Compléments",
    showFor: [],
    options: [
      { value: "rgpd", label: "Conformité RGPD et mentions légales", icon: "bouclier", price: 430 },
      { value: "formation", label: "Formation à la prise en main", icon: "livre", price: 520 },
      { value: "analytics", label: "Analytics et suivi des conversions", icon: "graphique", price: 430 },
      { value: "contenus", label: "Reprise et mise en forme des contenus", icon: "document", price: 560 }
    ]
  },
  {
    step: "lancement",
    key: "maintenance",
    type: "radio",
    label: "Maintenance mensuelle",
    help: "Facturée à part, chaque mois, après la mise en ligne.",
    required: 1,
    showFor: [],
    options: [
      { value: "aucune", label: "Aucune", icon: "etincelles", monthlyMin: 0, monthlyMax: 0 },
      {
        value: "essentielle",
        label: "Essentielle",
        help: "Mises à jour, sauvegardes, surveillance",
        icon: "cle",
        monthlyMin: 60,
        monthlyMax: 120
      },
      {
        value: "complete",
        label: "Complète",
        help: "Maintenance et évolutions incluses",
        icon: "bouclier",
        monthlyMin: 200,
        monthlyMax: 450
      }
    ]
  },
  {
    step: "lancement",
    key: "budget",
    type: "radio",
    label: "Quel budget avez-vous en tête ?",
    help: "Cette réponse n'influence pas l'estimation, elle m'aide à ajuster ma proposition.",
    showFor: [],
    options: [
      { value: "<2000", label: "Moins de 2 000 €", icon: "euro" },
      { value: "2000-5000", label: "2 000 à 5 000 €", icon: "euro" },
      { value: "5000-15000", label: "5 000 à 15 000 €", icon: "euro" },
      { value: "15000-40000", label: "15 000 à 40 000 €", icon: "euro" },
      { value: ">40000", label: "Plus de 40 000 €", icon: "euro" },
      { value: "inconnu", label: "Je ne sais pas encore", icon: "discussion" }
    ]
  },

  // ── Coordonnées ────────────────────────────────────────────────────────────
  { step: "coordonnees", key: "name", type: "text", label: "Nom et prénom", required: 1, showFor: [], config: { maxLength: 100 } },
  { step: "coordonnees", key: "email", type: "email", label: "Adresse e-mail", required: 1, showFor: [], config: { maxLength: 254 } },
  { step: "coordonnees", key: "company", type: "text", label: "Entreprise", showFor: [], config: { maxLength: 120 } },
  { step: "coordonnees", key: "phone", type: "tel", label: "Téléphone", showFor: [], config: { maxLength: 30 } },
  {
    step: "coordonnees",
    key: "details",
    type: "textarea",
    label: "Un mot sur votre projet",
    help: "Contexte, contraintes, exemples de sites que vous aimez…",
    showFor: [],
    config: { maxLength: 3000 }
  }
];

module.exports = { steps, types, questions };
