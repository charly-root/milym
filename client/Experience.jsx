import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CustomCursor } from "./components/CustomCursor.jsx";
import { createHomeTimeline } from "./animations/homeTimeline.js";
import { usePerformanceTier } from "./hooks/usePerformanceTier.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { getQualityProfile } from "./utils/quality.js";
import { experienceStore } from "./store.js";

const ExperienceCanvas = lazy(() =>
  import("./ExperienceCanvas.jsx").then((mod) => ({ default: mod.ExperienceCanvas }))
);

export function Experience({ root }) {
  const reduced = useReducedMotion();
  const tier = usePerformanceTier();
  const quality = useMemo(() => getQualityProfile(tier), [tier]);
  const [frameloop, setFrameloop] = useState("always");
  const logoUrl = root.dataset.logo || "/logos/logo.svg";

  useEffect(() => {
    experienceStore.tier = tier;
    experienceStore.reducedMotion = reduced;
  }, [tier, reduced]);

  useEffect(() => {
    const story = document.getElementById("home-story");
    if (reduced) {
      story?.classList.add("is-static");
      story?.classList.remove("is-cinematic");
      return undefined;
    }

    story?.classList.add("is-cinematic");
    story?.classList.remove("is-static");
    const cleanup = createHomeTimeline(story || root);
    return () => {
      cleanup();
      story?.classList.remove("is-cinematic");
    };
  }, [reduced, root]);

  useEffect(() => {
    const story = document.getElementById("home-story-track") || root;
    const observer = new IntersectionObserver(
      ([entry]) => setFrameloop(entry.isIntersecting ? "always" : "never"),
      { threshold: 0.02 }
    );
    observer.observe(story);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    const onPointer = (event) => {
      experienceStore.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      experienceStore.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  if (reduced) return null;

  return (
    <>
      <Suspense fallback={null}>
        <ExperienceCanvas quality={quality} logoUrl={logoUrl} tier={tier} frameloop={frameloop} />
      </Suspense>
      <CustomCursor />
    </>
  );
}
