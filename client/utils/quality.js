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
  const cap = tier === "desktop" ? 1.75 : tier === "laptop" ? 1.5 : 1.15;
  return Math.min(window.devicePixelRatio || 1, cap);
}

export function getQualityProfile(tier) {
  if (tier === "mobile") {
    return {
      particles: 12,
      particleCount: 5000,
      particleSize: 2.5,
      aiNodes: 24,
      shadows: false,
      antialias: false,
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
