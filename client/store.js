/** État partagé entre GSAP (scroll, DOM) et React Three Fiber (useFrame). */
export const experienceStore = {
  progress: 0,
  pointer: { x: 0, y: 0 },
  hovered: null,
  hoverLabel: "",
  hoverTitle: "",
  hoverDescription: "",
  hoverStack: "",
  tier: "desktop",
  reducedMotion: false
};
