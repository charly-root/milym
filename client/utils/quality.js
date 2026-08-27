export function getPerformanceTier() {
  if (typeof window === "undefined") return "laptop";

  const isTouch = window.matchMedia("(hover: none)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  if (reduced) return "mobile";
  if (isTouch || width < 768) return "mobile";
  if (cores <= 4 || memory <= 4 || width < 1200) return "laptop";
  return "desktop";
}

export function getDpr(tier) {
  const native = window.devicePixelRatio || 1;
  if (tier === "desktop") return [1.25, Math.min(native, 2)];
  if (tier === "laptop") return [1.15, Math.min(native, 1.75)];
  // Téléphone retina (2×–3×) : rester à 2×. Un plafond à ~1,15 étirait un
  // tampon trop petit et rendait toute la scène floue.
  return Math.min(Math.max(native, 1), 2);
}

export function getQualityProfile(tier) {
  if (tier === "mobile") {
    return {
      particles: 12,
      particleCount: 5000,
      particleSize: 2.7,
      aiNodes: 24,
      shadows: false,
      antialias: true,
      transmission: false,
      extraLights: false,
      contactShadows: false,
      postprocessing: false
    };
  }

  if (tier === "laptop") {
    return {
      particles: 36,
      particleCount: 12000,
      particleSize: 2.9,
      aiNodes: 32,
      shadows: false,
      antialias: true,
      transmission: false,
      extraLights: true,
      contactShadows: true,
      postprocessing: true
    };
  }

  return {
    particles: 72,
    particleCount: 22000,
    particleSize: 3.1,
    aiNodes: 48,
    shadows: true,
    antialias: true,
    transmission: true,
    extraLights: true,
    contactShadows: true,
    postprocessing: true
  };
}
