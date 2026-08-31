import { between } from "../utils/acts.js";

/**
 * Le noyau s'ouvre en planète à anneaux (le plan « Saturne ») pendant le
 * cran « Tout se rassemble », puis se referme en quittant vers l'écosystème.
 */
export function coreOpenAmount(progress) {
  return between(progress, 0.858, 0.882) * (1 - between(progress, 0.922, 0.948));
}

/** Passage du noyau au centre de l'écosystème. */
export function coreHubAmount(progress) {
  return between(progress, 0.918, 0.948);
}
