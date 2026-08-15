import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity, lerp } from "../../utils/math.js";
import { ecosystemSpinSpeed } from "../../animations/ecosystemTimeline.js";
import {
  createBrowserTexture,
  createPhoneTexture,
  createAiPanelTexture,
  createLabelTexture,
  createToolTexture
} from "../../utils/textures.js";

const ITEMS = [
  {
    id: "web",
    label: "Sites web",
    href: "/projets#sites-web",
    description: "Sites modernes, rapides et soignés."
  },
  {
    id: "app",
    label: "Applications",
    href: "/projets#applications",
    description: "Applications modernes, rapides et connectées."
  },
  {
    id: "ai",
    label: "Intelligence artificielle",
    href: "/projets#intelligence-artificielle",
    description: "Des outils classiques aux systèmes intelligents."
  },
  {
    id: "backend",
    label: "Backend",
    href: "/projets",
    description: "API, services et architecture Node.js."
  },
  {
    id: "data",
    label: "Database",
    href: "/projets",
    description: "Données structurées, sûres et accessibles."
  },
  {
    id: "auto",
    label: "Automatisation",
    href: "/projets#outils",
    description: "Trigger → Logic → API → Action."
  }
];

export function MilymEcosystem({ quality }) {
  const group = useRef();
  const spin = useRef(0);
  const textures = useMemo(
    () => ({
      web: createBrowserTexture("site"),
      app: createPhoneTexture(),
      ai: createAiPanelTexture(),
      backend: createLabelTexture("Node.js", "Services"),
      data: createLabelTexture("Data", "Storage"),
      auto: createToolTexture()
    }),
    []
  );

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.88, 0.91, 0.965, 1);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    const hovered = experienceStore.hovered;
    const speed = ecosystemSpinSpeed(hovered);
    spin.current += delta * speed * visible;
    group.current.rotation.y = spin.current;
  });

  return (
    <group ref={group} position={[0, 0.7, 0]}>
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshPhysicalMaterial
          color="#0b0712"
          roughness={0.18}
          metalness={0.55}
          emissive="#4c1d95"
          emissiveIntensity={0.2}
          transmission={quality.transmission ? 0.15 : 0}
        />
      </mesh>
      {ITEMS.map((item, i) => (
        <OrbitItem key={item.id} item={item} index={i} texture={textures[item.id]} />
      ))}
    </group>
  );
}

function OrbitItem({ item, index, texture }) {
  const ref = useRef();
  const angle = (index / ITEMS.length) * Math.PI * 2;
  const radius = 2.15;
  const isPhone = item.id === "app";

  useFrame((_, delta) => {
    if (!ref.current) return;
    const hovered = experienceStore.hovered === item.id;
    const targetScale = hovered ? 1.18 : 1;
    const targetRadius = hovered ? 1.55 : radius;
    const r = lerp(ref.current.userData.r ?? radius, targetRadius, 1 - Math.pow(0.04, delta));
    ref.current.userData.r = r;
    ref.current.position.set(Math.cos(angle) * r, Math.sin(angle * 2) * 0.15, Math.sin(angle) * r);
    const s = lerp(ref.current.scale.x, targetScale, 1 - Math.pow(0.04, delta));
    ref.current.scale.setScalar(s);
    ref.current.lookAt(0, 0.7, 4.5);
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        experienceStore.hovered = item.id;
        experienceStore.hoverLabel = "Explorer";
        document.body.style.cursor = "none";
      }}
      onPointerOut={() => {
        if (experienceStore.hovered === item.id) {
          experienceStore.hovered = null;
          experienceStore.hoverLabel = "";
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        window.location.href = item.href;
      }}
    >
      <mesh>
        {isPhone ? <planeGeometry args={[0.42, 0.84]} /> : <planeGeometry args={[0.9, 0.56]} />}
        <meshStandardMaterial map={texture} roughness={0.25} metalness={0.1} />
      </mesh>
    </group>
  );
}
