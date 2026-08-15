import { useEffect, useState } from "react";
import { experienceStore } from "../store.js";

export function useScrollProgress() {
  const [progress, setProgress] = useState(experienceStore.progress);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setProgress(experienceStore.progress);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return progress;
}
