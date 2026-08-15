import { useEffect } from "react";
import { createHomeTimeline } from "../animations/homeTimeline.js";

export function useGSAPTimeline(enabled, scope) {
  useEffect(() => {
    if (!enabled) return undefined;
    return createHomeTimeline(scope);
  }, [enabled, scope]);
}
