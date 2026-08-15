import { useEffect, useState } from "react";
import { getPerformanceTier } from "../utils/quality.js";

export function usePerformanceTier() {
  const [tier, setTier] = useState(() => getPerformanceTier());

  useEffect(() => {
    const onResize = () => setTier(getPerformanceTier());
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return tier;
}
