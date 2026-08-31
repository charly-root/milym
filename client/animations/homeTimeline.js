import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { experienceStore } from "../store.js";
import { ACTS, BOOM, FLASH, PROLOGUE, SNAP_CHAPTERS, chapterSnapProgress, storyProgress } from "../stage.js";

gsap.registerPlugin(Observer);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const isTypingTarget = (el) => {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/**
 * Une seule timeline pilote tout : la progression 3D, l'apparition des textes,
 * le repère de lecture et l'état du header. Les plages viennent de `ACTS`, donc
 * un chapitre ne peut pas se désynchroniser de la scène qu'il commente.
 *
 * Le récit avance par crans : un geste de scroll joue la transition jusqu'au
 * point suivant (Espace → Idée → Croquis…), puis ignore les gestes jusqu'à
 * ce que l'animation soit terminée.
 */
export function createHomeTimeline(root) {
  const track = document.getElementById("home-story-track");
  const storyRoot = document.getElementById("home-story");
  if (!track) return () => {};

  const nav = document.getElementById("navbar");
  const bar = document.getElementById("story-progress");
  const hint = document.getElementById("story-hint");
  const flash = document.getElementById("story-flash");
  const about = document.getElementById("a-propos");

  const snapSet = new Set(SNAP_CHAPTERS);

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
      id: element.dataset.chapter,
      element,
      start,
      end,
      snap: chapterSnapProgress(element.dataset.chapter),
      fade: Math.min((end - start) * 0.3, 0.025),
      openStart: start <= 0,
      openEnd: end >= 1
    };
  });

  const snapList = SNAP_CHAPTERS.map((id) => chapters.find((chapter) => chapter.id === id)).filter(Boolean);
  const snaps = snapList.map((chapter) => chapter.snap);
  const lastIndex = snaps.length - 1;
  const steps = gsap.utils.toArray("[data-rail-step]");

  // La cascade typographique (CSS) n'est armée qu'après le premier rendu :
  // sinon la classe arriverait dans le même recalcul de style que
  // `is-cinematic` et l'entrée du premier chapitre ne se jouerait pas.
  let armed = false;
  const state = { progress: 0 };
  let index = 0;
  let pinned = false;
  let locked = false;
  let ignoreUntil = 0;
  let tween = null;
  let exitTimer = 0;

  const render = (progress) => {
    const story = storyProgress(progress);
    experienceStore.progress = story;
    experienceStore.rawProgress = progress;

    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (hint) hint.style.opacity = String(1 - Math.min(progress / 0.02, 1));

    if (flash) {
      const up = clamp01((progress - FLASH.start) / Math.max(0.001, FLASH.peak - FLASH.start));
      const down = 1 - clamp01((progress - FLASH.peak) / Math.max(0.001, FLASH.end - FLASH.peak));
      flash.style.opacity = String(Math.min(up, down));
    }

    if (nav) {
      // Le header n'existe vraiment qu'une fois l'idée passée au numérique.
      const digital = story > ACTS.interface[0];
      nav.classList.toggle("nav-home-visible", digital);
      nav.classList.toggle("nav-scrolled", digital);
    }

    let active = 0;
    chapters.forEach(({ id, element }) => {
      // Wireframe et prototype n'ont pas de palier : leur texte reste caché,
      // l'animation 3D se joue quand même entre Croquis et Interface.
      if (!snapSet.has(id)) {
        element.style.opacity = "0";
        element.setAttribute("aria-hidden", "true");
        element.classList.remove("is-live");
        return;
      }

      const snapIndex = SNAP_CHAPTERS.indexOf(id);
      const holdStart = snapIndex <= 0 ? 0 : (snaps[snapIndex - 1] + snaps[snapIndex]) / 2;
      const holdEnd = snapIndex >= lastIndex ? 1 : (snaps[snapIndex] + snaps[snapIndex + 1]) / 2;
      const edge = Math.min(0.018, Math.abs(holdEnd - holdStart) * 0.24);

      let opacity = 0;
      if (progress >= holdStart - edge && progress <= holdEnd + edge) {
        if (snapIndex > 0 && progress < holdStart + edge) opacity = (progress - (holdStart - edge)) / (edge * 2);
        else if (snapIndex < lastIndex && progress > holdEnd - edge) opacity = (holdEnd + edge - progress) / (edge * 2);
        else opacity = 1;
      }
      opacity = Math.min(1, Math.max(0, opacity));

      element.style.opacity = String(opacity);
      element.setAttribute("aria-hidden", opacity < 0.3 ? "true" : "false");
      element.classList.toggle("is-live", armed && opacity > 0.12);
    });

    snaps.forEach((snap, snapIndex) => {
      if (progress >= snap - 0.002) active = snapIndex;
    });

    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex === active;
      step.classList.toggle("is-active", isActive);
      step.classList.toggle("is-done", stepIndex < active);
      if (isActive) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };

  const apply = () => render(state.progress);

  const canStep = () => !locked && performance.now() >= ignoreUntil;

  const pin = () => {
    if (pinned) return;
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prevBehavior;
    pinned = true;
    html.classList.add("is-story-pinned");
    storyRoot?.classList.add("is-pinned");
    observer.enable();
  };

  const unpin = () => {
    if (!pinned) return;
    pinned = false;
    document.documentElement.classList.remove("is-story-pinned");
    storyRoot?.classList.remove("is-pinned");
    observer.disable();
  };

  const durationFor = (fromIndex, toIndex, fromProgress, toProgress) => {
    const hops = Math.abs(toIndex - fromIndex);
    const distance = Math.abs(toProgress - fromProgress);
    const a = Math.min(fromProgress, toProgress);
    const b = Math.max(fromProgress, toProgress);
    const crossesBoom = a < BOOM.peak && b > BOOM.start;
    const intoLogo = hops === 1 && SNAP_CHAPTERS[Math.max(fromIndex, toIndex)] === "final";
    if (intoLogo) return 3.8;
    return gsap.utils.clamp(
      0.85,
      crossesBoom ? 2.35 : 1.7,
      (crossesBoom ? 1.45 : 0.9) + hops * 0.1 + distance * 2.6
    );
  };

  const goTo = (next, { immediate = false, force = false } = {}) => {
    if (next < 0 || next > lastIndex) return false;
    if (!immediate && !force && !canStep()) return false;
    if (!immediate && next === index && Math.abs(state.progress - snaps[next]) < 0.001) return false;

    const fromIndex = index;
    const fromProgress = state.progress;
    const target = snaps[next];
    index = next;
    pin();

    if (immediate) {
      tween?.kill();
      state.progress = target;
      apply();
      return true;
    }

    const intoLogo =
      Math.abs(next - fromIndex) === 1 && SNAP_CHAPTERS[Math.max(fromIndex, next)] === "final";
    locked = true;
    tween?.kill();
    tween = gsap.to(state, {
      progress: target,
      duration: durationFor(fromIndex, next, fromProgress, target),
      ease: intoLogo ? "power1.inOut" : "power2.inOut",
      overwrite: true,
      onUpdate: apply,
      onComplete: () => {
        locked = false;
        ignoreUntil = performance.now() + 160;
      }
    });
    return true;
  };

  const exitStory = () => {
    if (!canStep()) return;
    locked = true;
    tween?.kill();
    unpin();
    const y = about
      ? Math.round(about.getBoundingClientRect().top + window.scrollY - 12)
      : Math.round(window.innerHeight);
    window.scrollTo({ top: Math.max(y, window.innerHeight * 0.45), behavior: "smooth" });
    window.clearTimeout(exitTimer);
    exitTimer = window.setTimeout(() => {
      locked = false;
      ignoreUntil = performance.now() + 240;
    }, 900);
  };

  const step = (dir) => {
    if (!canStep()) return;
    const next = index + dir;
    if (next < 0) return;
    if (next > lastIndex) {
      if (dir > 0) exitStory();
      return;
    }
    goTo(next);
  };

  const observer = Observer.create({
    type: "wheel,touch",
    wheelSpeed: -1,
    tolerance: window.matchMedia("(hover: none)").matches ? 28 : 12,
    preventDefault: true,
    onUp: () => step(1),
    onDown: () => step(-1)
  });
  observer.disable();

  const onKey = (event) => {
    if (!pinned || isTypingTarget(event.target)) return;
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(lastIndex);
    }
  };

  const onScroll = () => {
    if (locked || pinned) return;
    if (window.scrollY <= 2) pin();
  };

  const onRailClick = (event) => {
    const stepEl = event.target.closest("[data-rail-step]");
    if (!stepEl) return;
    const next = Number(stepEl.dataset.railStep);
    if (!Number.isFinite(next)) return;
    goTo(next, { force: true });
  };

  const context = gsap.context(() => {
    gsap.utils.toArray(".btn-primary, .btn-ghost, .story-ecosystem-nav a").forEach((button) => {
      button.addEventListener("pointerenter", () =>
        gsap.to(button, { y: -2, scale: 1.02, duration: 0.35, ease: "power3.out", overwrite: "auto" })
      );
      button.addEventListener("pointerleave", () =>
        gsap.to(button, { y: 0, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" })
      );
    });
  }, root);

  const abort = new AbortController();
  const { signal } = abort;
  window.addEventListener("keydown", onKey, { signal });
  window.addEventListener("scroll", onScroll, { passive: true, signal });
  steps.forEach((stepEl) => {
    stepEl.setAttribute("role", "button");
    stepEl.tabIndex = 0;
    stepEl.addEventListener("click", onRailClick, { signal });
    stepEl.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onRailClick({ target: stepEl });
      },
      { signal }
    );
  });

  const startAtHash = Boolean(window.location.hash);
  if (startAtHash || window.scrollY > window.innerHeight * 0.4) {
    index = lastIndex;
    state.progress = snaps[index];
    apply();
  } else {
    pin();
    render(0);
  }

  requestAnimationFrame(() => {
    armed = true;
    apply();
  });

  return () => {
    abort.abort();
    window.clearTimeout(exitTimer);
    tween?.kill();
    observer.kill();
    document.documentElement.classList.remove("is-story-pinned");
    storyRoot?.classList.remove("is-pinned");
    context.revert();
  };
}
