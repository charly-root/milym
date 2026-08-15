import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity, smoothstep, lerp } from "../../utils/math.js";
import { createDigitalTexture, createBrowserTexture } from "../../utils/textures.js";

export function PrototypeScreen() {
  const group = useRef();
  const screen = useRef();
  const wire = useMemo(() => createDigitalTexture(), []);
  const finished = useMemo(() => createBrowserTexture("site"), []);

  useFrame(() => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.22, 0.3, 0.48, 0.58);
    const open = smoothstep(0.24, 0.36, p);
    const polish = smoothstep(0.34, 0.48, p);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y = lerp(0.08, -0.35, smoothstep(0.46, 0.58, p));
    if (screen.current) {
      const wireMat = screen.current.children[0]?.material;
      const doneMat = screen.current.children[1]?.material;
      if (wireMat) wireMat.opacity = (1 - polish) * visible;
      if (doneMat) doneMat.opacity = polish * visible;
    }
    group.current.userData.open = open;
    const lid = group.current.children.find((c) => c.name === "lid");
    if (lid) lid.rotation.x = lerp(-0.08, -0.18, open);
  });

  return (
    <group ref={group} position={[0, 0.55, 0.05]}>
      <mesh position={[0, 0.02, 0.05]} castShadow>
        <boxGeometry args={[1.7, 0.05, 1.1]} />
        <meshStandardMaterial color="#121218" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.05, 0.28]}>
        <boxGeometry args={[0.42, 0.012, 0.22]} />
        <meshStandardMaterial color="#1c1c24" metalness={0.4} roughness={0.4} />
      </mesh>

      <group name="lid" position={[0, 0.05, -0.48]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[1.68, 0.98, 0.04]} />
          <meshStandardMaterial color="#0e0e14" metalness={0.6} roughness={0.28} />
        </mesh>
        <group ref={screen} position={[0, 0.48, 0.024]}>
          <mesh>
            <planeGeometry args={[1.52, 0.86]} />
            <meshStandardMaterial
              map={wire}
              transparent
              opacity={1}
              roughness={0.25}
              metalness={0.1}
              emissive="#2e1064"
              emissiveIntensity={0.15}
            />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[1.52, 0.86]} />
            <meshStandardMaterial
              map={finished}
              transparent
              opacity={0}
              roughness={0.2}
              metalness={0.08}
              emissive="#4c1d95"
              emissiveIntensity={0.22}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
