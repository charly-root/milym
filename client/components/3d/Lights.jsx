import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { lerp, smoothstep } from "../../utils/math.js";

export function Lights({ quality }) {
  const lamp = useRef();
  const purple = useRef();
  const fill = useRef();

  useFrame(() => {
    const p = experienceStore.progress;
    const digital = smoothstep(0.18, 0.42, p);
    if (lamp.current) lamp.current.intensity = lerp(7.5, 0.15, digital);
    if (purple.current) purple.current.intensity = lerp(0.2, 5.2, digital);
    if (fill.current) fill.current.intensity = lerp(0.15, 0.55, digital);
  });

  return (
    <>
      <ambientLight intensity={0.12} color="#9aa0b5" />
      <hemisphereLight args={["#2a2038", "#050507", 0.35]} />

      <spotLight
        ref={lamp}
        position={[-1.55, 2.4, 0.9]}
        angle={0.55}
        penumbra={0.85}
        color="#f2e6d4"
        intensity={7.5}
        distance={9}
        castShadow={quality.shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        ref={purple}
        position={[0.8, 1.8, 2.2]}
        color="#8b5cf6"
        intensity={0.2}
        distance={10}
      />

      <pointLight
        ref={fill}
        position={[-2.2, 1.2, -1.4]}
        color="#64748b"
        intensity={0.15}
        distance={12}
      />

      {quality.extraLights && (
        <rectAreaLight
          position={[0, 2.4, 1.2]}
          width={4}
          height={1.2}
          intensity={1.4}
          color="#c4b5fd"
          rotation={[-Math.PI / 2.6, 0, 0]}
        />
      )}
    </>
  );
}
