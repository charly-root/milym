import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { ecosystemSpinSpeed, ecosystemRadius } from "../../animations/ecosystemTimeline.js";
import {
  createSiteTexture,
  createPhoneTexture,
  createAiPanelTexture,
  createDashboardTexture,
  createDataPanelTexture,
  createAutomationTexture
} from "../../utils/textures.js";

const ITEMS = [
  {
    id: "web",
    label: "Sites web",
    description: "Vitrines rapides, soignées, pensées pour convertir.",
    stack: "Présence · clarté · conversion",
    href: "/projets#sites-web",
    size: [0.86, 0.51]
  },
  {
    id: "app",
    label: "Applications",
    description: "Applications modernes, rapides et connectées.",
    stack: "Usage · fluidité · lien",
    href: "/projets#applications",
    size: [0.4, 0.8]
  },
  {
    id: "ai",
    label: "Intelligence artificielle",
    description: "Des outils classiques aux systèmes intelligents.",
    stack: "Comprendre · répondre · apprendre",
    href: "/projets#intelligence-artificielle",
    size: [0.82, 0.51]
  },
  {
    id: "backend",
    label: "Systèmes",
    description: "Ce qui tourne derrière : accès, logique, confiance.",
    stack: "Passerelle · serveur · sécurité",
    href: "/projets",
    size: [0.82, 0.51]
  },
  {
    id: "data",
    label: "Mémoire",
    description: "Des souvenirs structurés, sûrs et retrouvables.",
    stack: "Ordre · sûreté · durée",
    href: "/projets",
    size: [0.82, 0.51]
  },
  {
    id: "auto",
    label: "Automatisation",
    description: "Déclencher, enchaîner, relâcher — sans intervention.",
    stack: "Signal · enchaînement · action",
    href: "/projets#outils",
    size: [0.82, 0.51]
  }
];

/** L'écosystème : les activités de Milym gravitent autour du noyau. */
export function MilymEcosystem() {
  const group = useRef();
  const spin = useRef(0);

  const textures = useMemo(
    () => ({
      web: createSiteTexture(),
      app: createPhoneTexture(),
      ai: createAiPanelTexture(),
      backend: createDashboardTexture(),
      data: createDataPanelTexture(),
      auto: createAutomationTexture()
    }),
    []
  );

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    // Les cartes sortent avant l'arrivée des écrans du final : les deux
    // familles superposées rendaient la conclusion illisible.
    const presence = between(p, 0.908, 0.932) * (1 - between(p, 0.938, 0.962));
    setGroupOpacity(group.current, presence);
    if (!group.current.visible) {
      if (experienceStore.hovered) {
        experienceStore.hovered = null;
        experienceStore.hoverLabel = "";
      }
      return;
    }

    spin.current += delta * ecosystemSpinSpeed(experienceStore.hovered);
    group.current.userData.spin = spin.current;
  });

  return (
    <group ref={group} position={STAGE.center}>
      {ITEMS.map((item, index) => (
        <OrbitItem key={item.id} item={item} index={index} texture={textures[item.id]} />
      ))}
    </group>
  );
}

function OrbitItem({ item, index, texture }) {
  const ref = useRef();
  const { camera } = useThree();
  const base = (index / ITEMS.length) * Math.PI * 2;

  useFrame((_, delta) => {
    const node = ref.current;
    if (!node?.parent) return;

    const hovered = experienceStore.hovered === item.id;
    const spin = node.parent.userData.spin || 0;
    const angle = base + spin;

    const radius = lerp(
      node.userData.radius ?? ecosystemRadius(false),
      ecosystemRadius(hovered),
      1 - Math.pow(0.02, delta)
    );
    node.userData.radius = radius;

    node.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 2) * 0.22,
      Math.sin(angle) * radius
    );
    node.quaternion.copy(camera.quaternion);

    const scale = lerp(node.scale.x, hovered ? 1.16 : 1, 1 - Math.pow(0.02, delta));
    node.scale.setScalar(scale);
  });

  const select = () => {
    window.location.href = item.href;
  };

  return (
    <group
      ref={ref}
      onPointerOver={(event) => {
        event.stopPropagation();
        experienceStore.hovered = item.id;
        experienceStore.hoverLabel = "Explorer";
        experienceStore.hoverTitle = item.label;
        experienceStore.hoverDescription = item.description;
        experienceStore.hoverStack = item.stack;
      }}
      onPointerOut={() => {
        if (experienceStore.hovered !== item.id) return;
        experienceStore.hovered = null;
        experienceStore.hoverLabel = "";
      }}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
    >
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[item.size[0] + 0.05, item.size[1] + 0.05]} />
        <meshBasicMaterial color="#150c26" transparent opacity={0.9} />
      </mesh>
      <mesh>
        <planeGeometry args={item.size} />
        {/* Non éclairé : les cartes restent lisibles quel que soit l'angle. */}
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}
