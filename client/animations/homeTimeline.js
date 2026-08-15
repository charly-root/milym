import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experienceStore } from "../store.js";
import { ACTS } from "../stage.js";

gsap.registerPlugin(ScrollTrigger);

/**
 * Une seule timeline pilote tout : la progression 3D, l'apparition des textes,
 * le repère de lecture et l'état du header. Les plages viennent de `ACTS`, donc
 * un chapitre ne peut pas se désynchroniser de la scène qu'il commente.
 */
export function createHomeTimeline(root) {
  const track = document.getElementById("home-story-track");
  if (!track) return () => {};

  const nav = document.getElementById("navbar");
  const bar = document.getElementById("story-progress");
  const hint = document.getElementById("story-hint");

  const chapters = gsap.utils.toArray("[data-chapter]").map((element) => {
    const [start, end] = ACTS[element.dataset.chapter] || [0, 1];
    return { element, start, end, fade: Math.min((end - start) * 0.3, 0.028) };
  });

  const steps = gsap.utils.toArray("[data-rail-step]");

  const render = (progress) => {
    experienceStore.progress = progress;

    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (hint) hint.style.opacity = String(1 - Math.min(progress / 0.02, 1));

    if (nav) {
      // Le header n'existe vraiment qu'une fois l'idée passée au numérique.
      const digital = progress > ACTS.wireframe[0];
      nav.classList.toggle("nav-home-visible", digital);
      nav.classList.toggle("nav-scrolled", digital);
    }

    let active = 0;
    chapters.forEach(({ element, start, end, fade }, index) => {
      let opacity = 0;
      if (progress > start - fade && progress < end + fade) {
        if (progress < start + fade) opacity = (progress - (start - fade)) / (fade * 2);
        else if (progress > end - fade) opacity = ((end + fade) - progress) / (fade * 2);
        else opacity = 1;
      }
      opacity = Math.min(1, Math.max(0, opacity));

      element.style.opacity = String(opacity);
      element.style.transform = `translate3d(0, ${((1 - opacity) * 14).toFixed(2)}px, 0)`;
      element.style.filter = opacity > 0.99 ? "none" : `blur(${((1 - opacity) * 5).toFixed(2)}px)`;
      element.setAttribute("aria-hidden", opacity < 0.3 ? "true" : "false");

      if (progress >= start && progress < end) active = index;
    });

    steps.forEach((step, index) => {
      step.classList.toggle("is-active", index === active);
      step.classList.toggle("is-done", index < active);
    });
  };

  const context = gsap.context(() => {
    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => render(self.progress)
    });

    const first = chapters[0]?.element;
    if (first) {
      gsap.from(first.children, {
        y: 22,
        opacity: 0,
        filter: "blur(6px)",
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15
      });
    }

    gsap.utils.toArray(".btn-primary, .btn-ghost, .story-ecosystem-nav a").forEach((button) => {
      button.addEventListener("pointerenter", () =>
        gsap.to(button, { y: -2, scale: 1.02, duration: 0.35, ease: "power3.out", overwrite: "auto" })
      );
      button.addEventListener("pointerleave", () =>
        gsap.to(button, { y: 0, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" })
      );
    });
  }, root);

  // Sans ce premier rendu, rien n'est visible tant que le visiteur n'a pas bougé.
  render(0);
  ScrollTrigger.refresh();

  return () => context.revert();
}
