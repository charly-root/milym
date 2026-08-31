import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CustomCursor } from "./components/CustomCursor.jsx";
import { HoverCard } from "./components/HoverCard.jsx";
import { createHomeTimeline } from "./animations/homeTimeline.js";
import { usePerformanceTier } from "./hooks/usePerformanceTier.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { getQualityProfile } from "./utils/quality.js";
import { experienceStore } from "./store.js";
import { playGunshot, playRangeOpen, unlockCinemaAudio } from "./fx/cinemaSound.js";

const ExperienceCanvas = lazy(() =>
  import("./ExperienceCanvas.jsx").then((mod) => ({ default: mod.ExperienceCanvas }))
);

export function Experience({ root }) {
  const reduced = useReducedMotion();
  const tier = usePerformanceTier();
  const quality = useMemo(() => getQualityProfile(tier), [tier]);
  const [frameloop, setFrameloop] = useState("always");

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
    const unlockOnce = () => unlockCinemaAudio();
    const onPointer = (event) => {
      experienceStore.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      experienceStore.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      experienceStore.pointerActive = true;
    };
    const onPointerDown = (event) => {
      experienceStore.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      experienceStore.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      unlockOnce();
      if (event.target.closest("a, button, input, textarea, select, label, [data-rail-step]")) return;
      if (experienceStore.reducedMotion) return;

      if (experienceStore.rangeMode) {
        experienceStore.shots += 1;
        experienceStore.pendingShot = {
          id: experienceStore.shots,
          x: experienceStore.pointer.x,
          y: experienceStore.pointer.y
        };
        playGunshot();
        return;
      }

      if (experienceStore.progress > 0.962) {
        experienceStore.logoClicks += 1;
        if (experienceStore.logoClicks >= 5) {
          experienceStore.rangeMode = true;
          experienceStore.shots = 0;
          playRangeOpen();
        }
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("wheel", unlockOnce, { once: true, passive: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("wheel", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
  }, []);

  if (reduced) return null;

  return (
    <>
      <Suspense fallback={null}>
        <ExperienceCanvas quality={quality} tier={tier} frameloop={frameloop} />
      </Suspense>
      <HoverCard />
      <CustomCursor />
    </>
  );
}
