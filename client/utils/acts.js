import { ACTS } from "../stage.js";
import { clamp, smoothstep } from "./math.js";

/** Progression 0 → 1 à l'intérieur d'un acte. */
export function actProgress(progress, act) {
  const [start, end] = ACTS[act];
  return clamp((progress - start) / (end - start));
}

/**
 * Présence d'une scène : elle monte pendant `fade` avant le début de `from`,
 * reste pleine, puis redescend pendant `fade` après la fin de `to`.
 */
export function presence(progress, from, to = from, fade = 0.03) {
  const start = ACTS[from][0];
  const end = ACTS[to][1];
  return smoothstep(start - fade, start + fade * 0.6, progress) * (1 - smoothstep(end - fade * 0.6, end + fade, progress));
}

/** Transition douce entre deux repères de la chronologie, en valeurs absolues. */
export function between(progress, start, end) {
  return smoothstep(start, end, progress);
}

/** Instant absolu d'un acte : `at("core", 0.5)` = milieu de l'acte. */
export function at(act, ratio = 0) {
  const [start, end] = ACTS[act];
  return start + (end - start) * ratio;
}
