/**
 * Chronologie de l'expérience d'accueil.
 *
 * Source unique de vérité : les chapitres HTML (views/index.ejs) sont repérés
 * par leur `data-chapter` et reçoivent leur plage depuis cette table, comme les
 * scènes 3D. Texte et image restent donc toujours synchronisés.
 */
export const ACTS = {
  idea: [0.0, 0.1],
  sketch: [0.1, 0.2],
  wireframe: [0.2, 0.3],
  prototype: [0.3, 0.4],
  interface: [0.4, 0.5],
  factory: [0.5, 0.6],
  backend: [0.6, 0.7],
  data: [0.7, 0.76],
  ai: [0.76, 0.82],
  core: [0.82, 0.9],
  ecosystem: [0.9, 0.96],
  final: [0.96, 1.0]
};

export const ACT_ORDER = Object.keys(ACTS);

export const ACT_LABELS = {
  idea: "Idée",
  sketch: "Croquis",
  wireframe: "Wireframe",
  prototype: "Prototype",
  interface: "Interface",
  factory: "Frontend",
  backend: "Backend",
  data: "Données",
  ai: "IA",
  core: "Digital Core",
  ecosystem: "Écosystème",
  final: "Produit"
};

/** Repères géométriques communs à toutes les scènes. */
export const STAGE = {
  /** Point où se joue toute l'histoire : la feuille y monte, l'écran s'y forme. */
  center: [0, 1.15, 0],
  /** La feuille au repos, posée sur la table. */
  deskPosition: [0, 0.03, 0.06],
  paper: { width: 1.06, height: 1.5 },
  screen: { width: 1.78, height: 1.0 },
  /** Écart entre deux plaques de la vue éclatée. */
  layerGap: 0.34,
  layerCount: 6,
  backendZ: -2.2,
  databaseZ: -2.9,
  aiZ: -2.85
};
