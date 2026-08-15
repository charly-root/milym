import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { rangeOpacity, smoothstep } from "../../utils/math.js";
import {
  createBrowserTexture,
  createPhoneTexture,
  createAiPanelTexture,
  createToolTexture
} from "../../utils/textures.js";

export function FinalProduct() {
  const group = useRef();
  const site = useMemo(() => createBrowserTexture("site"), []);
  const dash = useMemo(() => createBrowserTexture("dashboard"), []);
  const phone = useMemo(() => createPhoneTexture(), []);
  const ai = useMemo(() => createAiPanelTexture(), []);
  const tool = useMemo(() => createToolTexture(), []);

  useFrame(() => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.94, 0.97, 1, 1.05);
    const spread = smoothstep(0.97, 1, p);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y = -0.08 + spread * 0.12;
  });

  const screens = [
    { map: site, position: [0, 0.95, 0.2], scale: [1.7, 1.05, 1], rot: [0, 0, 0] },
    { map: dash, position: [-1.85, 0.7, -0.35], scale: [1.2, 0.75, 1], rot: [0, 0.35, 0] },
    { map: phone, position: [1.7, 0.55, -0.15], scale: [0.42, 0.84, 1], rot: [0, -0.28, 0] },
    { map: ai, position: [-1.1, 1.55, -0.7], scale: [0.95, 0.6, 1], rot: [0.08, 0.2, 0] },
    { map: tool, position: [1.05, 1.5, -0.65], scale: [0.95, 0.6, 1], rot: [0.08, -0.18, 0] }
  ];

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      {screens.map((screen, i) => (
        <mesh key={i} position={screen.position} rotation={screen.rot} scale={screen.scale}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            map={screen.map}
            roughness={0.22}
            metalness={0.12}
            emissive="#2e1064"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}
