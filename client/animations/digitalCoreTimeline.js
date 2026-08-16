import { between } from "../utils/acts.js";

/**
 * Le noyau s'ouvre pour montrer ce qu'il contient, puis se referme :
 * un produit numérique est un ensemble de pièces qui tiennent ensemble.
 * L'ouverture attend la fin de l'implosion et de l'onde de choc — pendant
 * l'aspiration, chaque pièce supplémentaire ne ferait que brouiller l'image.
 */
export function coreOpenAmount(progress) {
  return between(progress, 0.885, 0.905) * (1 - between(progress, 0.918, 0.942));
}

/** Passage du noyau au centre de l'écosystème. */
export function coreHubAmount(progress) {
  return between(progress, 0.9, 0.935);
}
