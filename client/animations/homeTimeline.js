import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experienceStore } from "../store.js";
import { ACTS, PROLOGUE, storyProgress } from "../stage.js";

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

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
  const flash = document.getElementById("story-flash");

  // Les chapitres vivent en progrès brut : le chapitre « Terre » occupe le
  // prologue, les autres reçoivent leur plage récit remappée après lui.
  const chapters = gsap.utils.toArray("[data-chapter]").map((element) => {
    const isEarth = element.dataset.chapter === "earth";
    const [s, e] = ACTS[element.dataset.chapter] || [0, 1];
    const start = isEarth ? 0 : PROLOGUE + s * (1 - PROLOGUE);
    // Le chapitre Terre s'efface avant le flash, pas sous lui : sinon son
    // titre et celui de l'idée se superposaient pendant le raccord.
    const end = isEarth ? PROLOGUE - 0.025 : PROLOGUE + e * (1 - PROLOGUE);
    return {
      element,
      start,
      end,
      fade: Math.min((end - start) * 0.3, 0.025),
      // Le premier chapitre est déjà là à l'ouverture, et le dernier ne doit
      // pas s'effacer au moment où l'on atteint ses boutons.
      openStart: start <= 0,
      openEnd: end >= 1
    };
  });

  const steps = gsap.utils.toArray("[data-rail-step]");

  // La cascade typographique (CSS) n'est armée qu'après le premier rendu :
  // sinon la classe arriverait dans le même recalcul de style que
  // `is-cinematic` et l'entrée du premier chapitre ne se jouerait pas.
  let armed = false;

  const render = (progress) => {
    const story = storyProgress(progress);
    experienceStore.progress = story;
    experienceStore.rawProgress = progress;

    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (hint) hint.style.opacity = String(1 - Math.min(progress / 0.02, 1));

    // Le flash blanc-violet qui couvre le raccord France → bureau : montée
    // rapide quand la surface remplit l'écran, retombée douce sur la feuille.
    if (flash) {
      const up = clamp01((progress - 0.084) / 0.012);
      const down = 1 - clamp01((progress - 0.103) / 0.016);
      flash.style.opacity = String(Math.min(up, down));
    }

    if (nav) {
      // Le header n'existe vraiment qu'une fois l'idée passée au numérique.
      const digital = story > ACTS.wireframe[0];
      nav.classList.toggle("nav-home-visible", digital);
      nav.classList.toggle("nav-scrolled", digital);
    }

    let active = 0;
    chapters.forEach(({ element, start, end, fade, openStart, openEnd }, index) => {
      let opacity = 0;
      const before = openStart ? -Infinity : start - fade;
      const after = openEnd ? Infinity : end + fade;

      if (progress > before && progress < after) {
        if (!openStart && progress < start + fade) opacity = (progress - before) / (fade * 2);
        else if (!openEnd && progress > end - fade) opacity = (after - progress) / (fade * 2);
        else opacity = 1;
      }
      opacity = Math.min(1, Math.max(0, opacity));

      element.style.opacity = String(opacity);
      element.style.transform = `translate3d(0, ${((1 - opacity) * 14).toFixed(2)}px, 0)`;
      element.style.filter = opacity > 0.99 ? "none" : `blur(${((1 - opacity) * 5).toFixed(2)}px)`;
      element.setAttribute("aria-hidden", opacity < 0.3 ? "true" : "false");
      // Les enfants entrent en cascade (kicker, titre, texte, boutons).
      element.classList.toggle("is-live", armed && opacity > 0.4);

      // Les chapitres sont ordonnés : le dernier commencé est l'actif.
      if (progress >= start) active = index;
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
  requestAnimationFrame(() => {
    armed = true;
    render(experienceStore.progress);
  });

  return () => context.revert();
}
