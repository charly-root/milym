import { smoothstep } from "../utils/math.js";

/** Explosion puis réassemblage du Digital Core selon la progression du scroll. */
export function coreExplodeAmount(progress) {
  return smoothstep(0.83, 0.87, progress) * (1 - smoothstep(0.88, 0.93, progress));
}
