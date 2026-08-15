import { useEffect, useRef } from "react";
import { experienceStore } from "../store.js";

/**
 * La description d'une catégorie de l'écosystème, affichée en HTML plutôt que
 * dans le canvas : le texte reste net et lisible.
 */
export function HoverCard() {
  const card = useRef(null);
  const title = useRef(null);
  const description = useRef(null);
  const stack = useRef(null);

  useEffect(() => {
    let frame = 0;
    let current = null;

    const tick = () => {
      const hovered = experienceStore.hovered;
      if (hovered !== current) {
        current = hovered;
        if (hovered) {
          title.current.textContent = experienceStore.hoverTitle;
          description.current.textContent = experienceStore.hoverDescription;
          stack.current.textContent = experienceStore.hoverStack;
        }
        card.current.classList.toggle("is-visible", Boolean(hovered));
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={card} className="story-hover-card" aria-hidden="true">
      <p ref={title} className="story-hover-title" />
      <p ref={description} className="story-hover-text" />
      <p ref={stack} className="story-hover-stack" />
    </div>
  );
}
