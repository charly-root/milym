// Données de démarrage : insérées dans la base SQLite uniquement si elle est vide.
// Une fois la base créée, gérer les projets et contacts depuis le centre de contrôle /admin.

const projects = [
  {
    title: "Nébula Dashboard",
    slug: "nebula-dashboard",
    description:
      "Tableau de bord d'analytics en temps réel avec graphiques interactifs et thème sombre.",
    image: "/images/nebula-dashboard.svg",
    category: "Applications",
    technologies: ["Node.js", "Express", "Tailwind CSS", "JavaScript"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  },
  {
    title: "Atelier Lumière",
    slug: "atelier-lumiere",
    description:
      "Site vitrine pour un studio de photographie, axé sur la performance et l'immersion visuelle.",
    image: "/images/atelier-lumiere.svg",
    category: "Sites web",
    technologies: ["WordPress", "JavaScript", "Tailwind CSS"],
    projectUrl: "https://exemple.com",
    githubUrl: null
  },
  {
    title: "Sentinelle IA",
    slug: "sentinelle-ia",
    description:
      "Assistant de veille intelligent qui résume automatiquement les articles techniques du jour.",
    image: "/images/sentinelle-ia.svg",
    category: "Intelligence artificielle",
    technologies: ["Python", "Flask", "Docker"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  },
  {
    title: "Forge CLI",
    slug: "forge-cli",
    description:
      "Outil en ligne de commande pour générer des squelettes de projets web en quelques secondes.",
    image: "/images/forge-cli.svg",
    category: "Outils",
    technologies: ["Node.js", "JavaScript"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  },
  {
    title: "Orbite 3D",
    slug: "orbite-3d",
    description:
      "Expérimentation WebGL : un système solaire interactif rendu directement dans le navigateur.",
    image: "/images/orbite-3d.svg",
    category: "Expérimentations",
    technologies: ["Three.js", "JavaScript"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  },
  {
    title: "Kiosque",
    slug: "kiosque",
    description:
      "Application de gestion de commandes pour restaurants avec suivi en direct côté cuisine.",
    image: "/images/kiosque.svg",
    category: "Applications",
    technologies: ["Vue.js", "Node.js", "Express", "Docker"],
    projectUrl: "https://exemple.com",
    githubUrl: null
  },
  {
    title: "Palette Studio",
    slug: "palette-studio",
    description:
      "Générateur de palettes de couleurs accessibles avec export CSS et Tailwind en un clic.",
    image: "/images/palette-studio.svg",
    category: "Outils",
    technologies: ["React", "JavaScript", "Tailwind CSS"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  },
  {
    title: "Échos",
    slug: "echos",
    description:
      "Blog minimaliste auto-hébergé avec rendu côté serveur et lecture ultra rapide.",
    image: "/images/echos.svg",
    category: "Sites web",
    technologies: ["Node.js", "Express", "EJS"],
    projectUrl: "https://exemple.com",
    githubUrl: "https://github.com/exemple"
  }
];

// Blocs affichés sur la page /contact (kind : phone, email, github, linkedin ou lien)
const contacts = [
  { kind: "phone", label: "Téléphone", value: "+33 6 00 00 00 00" },
  { kind: "email", label: "E-mail", value: "contact@exemple.com" },
  { kind: "github", label: "GitHub", value: "https://github.com/" },
  { kind: "linkedin", label: "LinkedIn", value: "https://linkedin.com/" }
];

// Catégories utilisées pour les filtres de la page projets et le formulaire admin
const categories = [
  "Tous",
  "Sites web",
  "Applications",
  "Intelligence artificielle",
  "Outils",
  "Expérimentations"
];

// Types de contacts disponibles dans le formulaire admin
const contactKinds = ["phone", "email", "github", "linkedin", "lien"];

// Réglages du site (logo + contenu de la page d'accueil), modifiables depuis /admin/accueil
const settings = {
  siteName: "milym",
  logoPath: "/logos/logo.svg",
  heroTitle: "Créateur de projets",
  heroSubtitle:
    "Je transforme des idées en expériences numériques modernes, utiles et originales.",
  aboutText:
    "Développeur passionné, je conçois des sites web, des applications et des outils qui allient esthétique, performance et simplicité. Chaque projet est une occasion d'explorer de nouvelles technologies et de créer quelque chose d'utile.",
  stat1Value: "8+",
  stat1Label: "Projets réalisés",
  stat2Value: "10+",
  stat2Label: "Technologies maîtrisées",
  stat3Value: "100%",
  stat3Label: "Curiosité et passion"
};

module.exports = { projects, contacts, categories, contactKinds, settings };
