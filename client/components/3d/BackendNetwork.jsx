import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { rangeOpacity } from "../../utils/math.js";
import { createLabelTexture } from "../../utils/textures.js";

const MODULES = [
  { title: "API Gateway", sub: "Entrée", position: [-0.85, 0.55, 0] },
  { title: "Node.js", sub: "Runtime", position: [0.15, 0.7, -0.2] },
  { title: "Auth", sub: "Sécurité", position: [0.95, 0.4, 0.15] },
  { title: "Services", sub: "Métier", position: [-0.2, 0.15, 0.45] }
];

export function BackendNetwork({ quality }) {
  const group = useRef();
  const textures = useMemo(
    () => MODULES.map((item) => createLabelTexture(item.title, item.sub, 640, 220)),
    []
  );

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.56, 0.62, 0.72, 0.8);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y += delta * 0.05 * visible;
  });

  return (
    <group ref={group} position={[0, 0.55, -0.2]}>
      {MODULES.map((item, i) => (
        <group key={item.title} position={item.position}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.42, 0.55]} />
            <meshPhysicalMaterial
              color="#0d0d14"
              roughness={0.22}
              metalness={0.45}
              transparent
              opacity={0.88}
              transmission={quality.transmission ? 0.12 : 0}
              emissive="#2e1064"
              emissiveIntensity={0.12}
            />
          </mesh>
          <mesh position={[0, 0, 0.29]}>
            <planeGeometry args={[0.8, 0.28]} />
            <meshBasicMaterial map={textures[i]} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
