/** Vitesse d'orbite de l'écosystème : ralentit au survol. */
export function ecosystemSpinSpeed(hovered) {
  return hovered ? 0.12 : 0.28;
}
