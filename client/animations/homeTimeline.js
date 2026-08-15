import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experienceStore } from "../store.js";

gsap.registerPlugin(ScrollTrigger);

export function createHomeTimeline(root) {
  const track = document.getElementById("home-story-track");
  const nav = document.getElementById("navbar");
  const progressBar = document.getElementById("story-progress");
  const chapters = gsap.utils.toArray("[data-chapter]");

  if (!track) return () => {};

  const ctx = gsap.context(() => {
    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.7,
      onUpdate: (self) => {
        const progress = self.progress;
        experienceStore.progress = progress;

        if (progressBar) {
          progressBar.style.transform = `scaleX(${progress})`;
        }

        if (nav) {
          const digital = progress > 0.18;
          nav.classList.toggle("nav-home-visible", digital);
          nav.classList.toggle("nav-scrolled", digital);
        }

        chapters.forEach((el) => {
          const start = Number(el.dataset.start);
          const end = Number(el.dataset.end);
          const fade = Math.min((end - start) * 0.28, 0.035);
          let opacity = 0;

          if (progress >= start && progress <= end) {
            if (progress < start + fade) opacity = (progress - start) / fade;
            else if (progress > end - fade) opacity = (end - progress) / fade;
            else opacity = 1;
          }

          el.style.opacity = String(opacity);
          el.style.filter = `blur(${((1 - opacity) * 6).toFixed(2)}px)`;
          el.style.transform = `translate3d(0, ${((1 - opacity) * 16).toFixed(1)}px, 0)`;
          el.setAttribute("aria-hidden", opacity < 0.25 ? "true" : "false");
        });
      }
    });

    gsap.utils.toArray(".btn-primary, .btn-ghost").forEach((btn) => {
      const enter = () => {
        gsap.to(btn, { y: -2, scale: 1.02, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      };
      const leave = () => {
        gsap.to(btn, { y: 0, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      };
      btn.addEventListener("pointerenter", enter);
      btn.addEventListener("pointerleave", leave);
    });
  }, root);

  ScrollTrigger.refresh();

  return () => ctx.revert();
}
