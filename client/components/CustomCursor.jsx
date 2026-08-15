import { useEffect, useRef } from "react";
import { experienceStore } from "../store.js";

export function CustomCursor() {
  const cursor = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    const touch = window.matchMedia("(hover: none)").matches;
    if (touch) return undefined;

    document.body.classList.add("has-custom-cursor");
    const onMove = (event) => {
      if (!cursor.current) return;
      cursor.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      if (label.current) {
        const active = Boolean(experienceStore.hovered);
        label.current.textContent = active ? experienceStore.hoverLabel || "Explorer" : "";
        label.current.style.opacity = active ? "1" : "0";
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
