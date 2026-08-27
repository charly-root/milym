import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { BOOM } from "../stage.js";

/**
 * Un champ d'étoiles derrière la Terre : la caméra d'ouverture est loin, il
 * faut quelque chose à l'infini pour que la distance se lise.
 */
export function StarField() {
  const points = useRef();
  const positions = useMemo(() => {
    const count = 520;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI * 0.85;
      const r = 28 + Math.random() * 36;
      arr[i * 3] = Math.cos(a) * Math.cos(b) * r;
      arr[i * 3 + 1] = Math.sin(b) * r * 0.72 + 1.15;
      arr[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r * 0.55 + 12;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!points.current) return;
    points.current.visible = experienceStore.rawProgress < BOOM.end + 0.02;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c9c4e8"
        size={0.085}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}
