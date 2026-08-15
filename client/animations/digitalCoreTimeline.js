import { between } from "../utils/acts.js";

/**
 * Le noyau s'ouvre pour montrer ce qu'il contient, puis se referme :
 * un produit numérique est un ensemble de pièces qui tiennent ensemble.
 */
export function coreOpenAmount(progress) {
  return between(progress, 0.848, 0.876) * (1 - between(progress, 0.879, 0.9));
}

/** Passage du noyau au centre de l'écosystème. */
export function coreHubAmount(progress) {
  return between(progress, 0.9, 0.935);
}
