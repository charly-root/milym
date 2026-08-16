/** État partagé entre GSAP (scroll, DOM) et React Three Fiber (useFrame). */
export const experienceStore = {
  /** Progrès du récit (0 → 1 après le prologue) : ce que lisent les scènes. */
  progress: 0,
  /** Progrès brut du scroll : prologue Terre, caméra et flash de transition. */
  rawProgress: 0,
  pointer: { x: 0, y: 0 },
  /** Vrai dès le premier mouvement de souris : active le halo du curseur. */
  pointerActive: false,
  hovered: null,
  hoverLabel: "",
  hoverTitle: "",
  hoverDescription: "",
  hoverStack: "",
  tier: "desktop",
  reducedMotion: false
};
