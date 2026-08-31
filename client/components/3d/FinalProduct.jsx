import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import {
  createSiteTexture,
  createDashboardTexture,
  createPhoneTexture,
  createAiPanelTexture,
  createAutomationTexture
} from "../../utils/textures.js";

/**
 * La dernière image : le projet est terminé, et il n'est pas seul. Les écrans
 * s'écartent lentement pour montrer qu'une idée peut prendre plusieurs formes.
 */
const SCREENS = [
  { id: "site", size: [1.62, 0.96], closed: [0, -0.18, 0.2], open: [0, -0.28, 0.38], tilt: 0 },
  { id: "dashboard", size: [1.0, 0.6], closed: [-0.45, -0.42, -0.4], open: [-1.78, -0.58, -0.42], tilt: 0.28 },
  { id: "phone", size: [0.34, 0.68], closed: [0.5, -0.44, -0.3], open: [1.72, -0.56, -0.28], tilt: -0.24 },
  { id: "ai", size: [0.86, 0.54], closed: [-0.38, 0.12, -0.5], open: [-1.68, 0.18, -0.52], tilt: 0.16 },
  { id: "tool", size: [0.86, 0.54], closed: [0.38, 0.12, -0.5], open: [1.68, 0.18, -0.52], tilt: -0.16 }
];

export function FinalProduct() {
  const group = useRef();
  const textures = useMemo(
    () => ({
      site: createSiteTexture(),
      dashboard: createDashboardTexture(),
      phone: createPhoneTexture(),
      ai: createAiPanelTexture(),
      tool: createAutomationTexture()
    }),
    []
  );

  useFrame(() => {
    const p = experienceStore.progress;
    if (!group.current) return;
    if (experienceStore.rangeMode) {
      group.current.visible = false;
      return;
    }

    // Les écrans n'entrent qu'une fois la caméra posée et la scène vidée
    // (noyau et écosystème partis) : l'enchaînement était le point bugué.
    const presence = between(p, 0.978, 0.988);
    setGroupOpacity(group.current, presence);
    if (!group.current.visible) return;

    const spread = between(p, 0.98, 0.991);
    group.current.children.forEach((screen, i) => {
      const { closed, open, tilt } = SCREENS[i];
      screen.position.set(
        lerp(closed[0], open[0], spread),
        lerp(closed[1], open[1], spread),
        lerp(closed[2], open[2], spread)
      );
      screen.rotation.y = tilt * spread;
    });
  });

  return (
    <group ref={group} position={STAGE.center}>
      {SCREENS.map((screen) => (
        <mesh key={screen.id} position={screen.closed}>
          <planeGeometry args={screen.size} />
          {/* Non éclairé : un écran émet sa propre lumière, il ne la reçoit pas. */}
          <meshBasicMaterial map={textures[screen.id]} transparent />
        </mesh>
      ))}
    </group>
  );
}
