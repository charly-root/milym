import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { STAGE, PROLOGUE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp, smoothstep } from "../../utils/math.js";

/**
 * Deux ambiances : la lampe chaude du bureau au début, la lumière violette du
 * studio dès que le croquis devient numérique.
 */
export function Lights({ quality }) {
  const lamp = useRef();
  const studio = useRef();
  const fill = useRef();
  const rim = useRef();

  useFrame(() => {
    const digital = between(experienceStore.progress, 0.14, 0.32);
    const machine = between(experienceStore.progress, 0.48, 0.8);
    const space = 1 - smoothstep(PROLOGUE - 0.01, PROLOGUE + 0.02, experienceStore.rawProgress);
    const present = 1 - space;
    if (lamp.current) lamp.current.intensity = lerp(5.2, 0.1, digital) * present;
    if (studio.current) studio.current.intensity = (lerp(0.12, 3.4, digital) + machine * 1.4) * present;
    if (fill.current) fill.current.intensity = (lerp(0.1, 0.5, digital) + machine * 0.45) * present;
    if (rim.current) rim.current.intensity = machine * 2.2 * present;
  });

  return (
    <>
      <ambientLight intensity={0.14} color="#9aa0b5" />
      <hemisphereLight args={["#241c33", "#050507", 0.32]} />

      <spotLight
        ref={lamp}
        position={[-1.3, 2.1, 0.8]}
        angle={0.6}
        penumbra={0.9}
        color="#f4e7d2"
        intensity={5.2}
        distance={8}
        castShadow={quality.shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        ref={studio}
        position={[1.4, STAGE.center[1] + 1.1, 2.4]}
        color="#8b5cf6"
        intensity={0.15}
        distance={12}
      />

      <pointLight
        ref={fill}
        position={[-2.4, STAGE.center[1] + 0.4, -1.6]}
        color="#64748b"
        intensity={0.12}
        distance={14}
      />

      <pointLight
        ref={rim}
        position={[0.2, STAGE.center[1] + 0.15, -3.1]}
        color="#e9d5ff"
        intensity={0}
        distance={11}
      />
    </>
  );
}
