import { useEffect, useRef } from "react";
import { experienceStore } from "../store.js";

/** Un point discret sur desktop, qui annonce ce qu'on peut faire d'un objet 3D. */
export function CustomCursor() {
  const cursor = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return undefined;

    document.body.classList.add("has-custom-cursor");
    let visible = false;

    const onMove = (event) => {
      const node = cursor.current;
      if (!node) return;
      node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;

      const active = Boolean(experienceStore.hovered);
      if (active !== visible) {
        visible = active;
        label.current.textContent = active ? experienceStore.hoverLabel || "Explorer" : "";
        node.classList.toggle("is-active", active);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.body.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={cursor} className="studio-cursor" aria-hidden="true">
      <span className="studio-cursor-dot" />
      <span ref={label} className="studio-cursor-label" />
    </div>
  );
}
