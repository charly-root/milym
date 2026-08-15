/** État partagé entre GSAP (DOM / scroll) et React Three Fiber (useFrame). */

export const experienceStore = {
  progress: 0,
  pointer: { x: 0, y: 0 },
  hovered: null,
  hoverLabel: "",
  tier: "desktop",
  reducedMotion: false
};

export const CHAPTERS = {
  idea: [0.0, 0.1],
  sketch: [0.1, 0.2],
  wireframe: [0.2, 0.3],
  prototype: [0.3, 0.4],
  interface: [0.4, 0.5],
  factory: [0.5, 0.6],
  backend: [0.6, 0.7],
  data: [0.7, 0.75],
  ai: [0.75, 0.8],
  core: [0.8, 0.9],
  ecosystem: [0.9, 0.96],
  final: [0.96, 1]
};
