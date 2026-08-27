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

/**
 * Crans de scroll. Wireframe et prototype n'ont pas de palier : ils se jouent
 * pendant la transition Croquis → Interface.
 */
export const SNAP_CHAPTERS = [
  "earth",
  "idea",
  "sketch",
  "interface",
  "factory",
  "backend",
  "data",
  "ai",
  "core",
  "ecosystem",
  "final"
];

/**
 * Prologue : la part du scroll réservée à la Terre vue de l'espace, avant que
 * le récit « de l'idée au produit » ne commence. Les scènes existantes vivent
 * en « progrès récit » (0 → 1) ; seule la caméra, la Terre et le flash de
 * transition lisent le progrès brut.
 */
export const PROLOGUE = 0.1;

/** En dessous, l'écran est traité comme un téléphone en portrait. */
export const PORTRAIT_ASPECT = 0.86;

/** 0 en paysage, 1 sur un écran très étroit. */
export function portraitAmount(aspect) {
  if (!(aspect > 0) || aspect >= PORTRAIT_ASPECT) return 0;
  return Math.min(1, (PORTRAIT_ASPECT - aspect) / 0.38);
}

export function storyProgress(raw) {
  return Math.min(1, Math.max(0, (raw - PROLOGUE) / (1 - PROLOGUE)));
}

/**
 * Progrès brut où un chapitre se « pose ». Un cran de scroll y amène la scène,
 * déjà lisible, après avoir joué la transition depuis le cran précédent.
 * L'espace reste à 0 (plan d'ouverture) ; le produit se pose près de la fin.
 */
export function chapterSnapProgress(chapter) {
  if (chapter === "earth") return 0;
  const range = ACTS[chapter];
  if (!range) return 0;
  const start = PROLOGUE + range[0] * (1 - PROLOGUE);
  const end = PROLOGUE + range[1] * (1 - PROLOGUE);
  const settle = chapter === "final" ? 0.72 : 0.58;
  return start + (end - start) * settle;
}

/** La Terre du prologue, posée loin derrière la caméra du récit. */
export const EARTH = {
  center: [0, 1.15, 20],
  radius: 4,
  /** Direction locale de la France sur la sphère (lat 46.6° N, lon 2.3° E). */
  france: [0.6864, 0.7266, -0.0276]
};

/**
 * L'explosion de la Terre, en progrès brut. La chauffe précède la détonation,
 * les débris et la lave vivent jusqu'au flash qui raccorde vers le bureau.
 * Partagé entre la Terre (débris, lave), la caméra (secousse, recul) et le
 * flash DOM pour que tout détone à la même frame.
 */
export const BOOM = {
  heatStart: 0.058,
  start: 0.074,
  peak: 0.088,
  end: 0.108
};

/** Repères géométriques communs à toutes les scènes. */
export const STAGE = {
  /** Point où se joue toute l'histoire : la feuille y monte, l'écran s'y forme. */
  center: [0, 1.15, 0],
  /** La feuille au repos, posée sur la table. */
  deskPosition: [0, 0.03, 0.06],
  paper: { width: 1.06, height: 1.5 },
  screen: { width: 1.78, height: 1.0 },
  /** Écart entre deux plaques de la vue éclatée (profondeur, paysage). */
  layerGap: 0.46,
  /** Écart vertical entre deux plaques en portrait. */
  layerGapY: 0.62,
  layerCount: 6,
  /** Backend, données et IA se relaient au même endroit : un sujet à la fois. */
  backendZ: -1.45,
  databaseZ: -1.45,
  aiZ: -1.45
};
