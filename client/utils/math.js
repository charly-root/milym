export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
  if (Math.abs(b - a) < 1e-6) return 0;
  return clamp((value - a) / (b - a));
}

export function smoothstep(edge0, edge1, x) {
  const t = inverseLerp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
}

/** Opacité d'un objet visible entre fadeIn et fadeOut, avec fondus. */
export function rangeOpacity(progress, fadeIn, holdStart, holdEnd, fadeOut) {
  if (progress <= fadeIn || progress >= fadeOut) return 0;
  if (progress < holdStart) return smoothstep(fadeIn, holdStart, progress);
  if (progress > holdEnd) return 1 - smoothstep(holdEnd, fadeOut, progress);
  return 1;
}

export function lerpArray(a, b, t) {
  return a.map((value, i) => lerp(value, b[i], t));
}

export function sampleKeyframes(frames, progress) {
  if (progress <= frames[0].p) return frames[0];
  if (progress >= frames[frames.length - 1].p) return frames[frames.length - 1];

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (progress >= a.p && progress <= b.p) {
      const t = smoothstep(a.p, b.p, progress);
      return {
        p: progress,
        pos: lerpArray(a.pos, b.pos, t),
        look: lerpArray(a.look, b.look, t),
        fov: lerp(a.fov, b.fov, t)
      };
    }
  }

  return frames[frames.length - 1];
}
