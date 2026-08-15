/** L'orbite ralentit dès qu'une catégorie retient l'attention. */
export function ecosystemSpinSpeed(hovered) {
  return hovered ? 0.06 : 0.2;
}

/** Distance au centre : la carte survolée s'avance vers la caméra. */
export function ecosystemRadius(hovered) {
  return hovered ? 1.35 : 2.05;
}
