import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import {
  createPaperTexture,
  createAnnotationTexture,
  createPaperTitleTexture,
  createWireframeUITexture,
  createFinalUITexture
} from "../../utils/textures.js";

/**
 * Les rectangles griffonnés deviennent des composants. Chaque bloc part de sa
 * place sur la feuille, se soulève, se redresse, puis rejoint sa position dans
 * l'interface finale avant de se fondre dedans.
 */
const BLOCKS = [
  { paper: [0, 0.545, 0.816, 0.1], screen: [0, 0.391, 1.585, 0.1], tilt: -0.02 },
  { paper: [-0.09, 0.305, 0.611, 0.09], screen: [-0.41, 0.222, 0.73, 0.09], tilt: 0.016 },
  { paper: [-0.268, 0.093, 0.255, 0.087], screen: [-0.605, 0.033, 0.341, 0.08], tilt: -0.026 },
  { paper: [-0.211, -0.234, 0.393, 0.311], screen: [-0.41, -0.269, 0.765, 0.323], tilt: 0.019 },
  { paper: [0.213, -0.234, 0.393, 0.311], screen: [0.41, -0.269, 0.765, 0.323], tilt: -0.014 }
];

/** Les blocs sont découpés dans la feuille : ils en gardent la couleur, puis
 *  deviennent du verre sombre en même temps qu'ils se redressent. */
const PAPER = new THREE.Color("#cdc2ad");
const GLASS = new THREE.Color("#1d1436");

const blockOutline = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

export function PaperScreen({ quality }) {
  const stage = useRef();
  const sheet = useRef();
  const blocks = useRef();
  const bezel = useRef();
  const screenLight = useRef();

  const maps = useMemo(
    () => ({
      sketch: createPaperTexture(),
      annotations: createAnnotationTexture(),
      title: createPaperTitleTexture(),
      wireframe: createWireframeUITexture(),
      final: createFinalUITexture()
    }),
    []
  );

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const group = stage.current;
    if (!group) return;

    // La feuille se redresse : de la table jusqu'au centre de la scène.
    const rise = between(p, 0.115, 0.24);
    // Elle change de proportions : A4 debout → écran 16:9.
    const morph = between(p, 0.2, 0.31);
    // Elle finit par s'effacer quand on passe derrière l'interface.
    const alive = 1 - between(p, 0.6, 0.665);

    group.visible = alive > 0.01;
    if (!group.visible) return;

    group.position.set(
      lerp(STAGE.deskPosition[0], STAGE.center[0], rise),
      lerp(STAGE.deskPosition[1], STAGE.center[1], rise),
      lerp(STAGE.deskPosition[2], STAGE.center[2], rise)
    );
    group.rotation.x = lerp(-Math.PI / 2, 0, rise);
    group.rotation.z = lerp(-0.05, 0, rise);

    const width = lerp(STAGE.paper.width, STAGE.screen.width, morph);
    const height = lerp(STAGE.paper.height, STAGE.screen.height, morph);
    sheet.current.scale.set(width, height, 1);

    // Le papier respire légèrement tant qu'il est encore du papier.
    const breath = (1 - morph) * 0.006;
    sheet.current.position.z = Math.sin(clock.elapsedTime * 0.5) * breath;

    const layers = sheet.current.children;
    // Fondu court entre le croquis et l'écran : trop long, les deux calques
    // restent à demi transparents et la feuille paraît éteinte.
    setLayerOpacity(layers[0], (1 - between(p, 0.2, 0.27)) * alive);
    setLayerOpacity(layers[1], (1 - between(p, 0.145, 0.225)) * alive);
    setLayerOpacity(
      layers[2],
      between(p, 0.025, 0.06) * (1 - between(p, 0.095, 0.145)) * alive
    );
    setLayerOpacity(
      layers[3],
      between(p, 0.205, 0.265) * (1 - between(p, 0.345, 0.415)) * alive
    );
    setLayerOpacity(layers[4], between(p, 0.365, 0.435) * alive);

    // Le cadre d'écran apparaît quand la feuille a fini de se redresser.
    const framed = between(p, 0.275, 0.35) * alive;
    bezel.current.visible = framed > 0.01;
    if (bezel.current.visible) {
      bezel.current.scale.set(width + 0.09, height + 0.09, 1);
      bezel.current.children[0].material.opacity = framed;
    }

    if (screenLight.current) {
      // Placée loin devant, la lampe éclaire les abords de l'écran sans poser
      // de tache blanche au milieu de l'interface.
      screenLight.current.intensity = between(p, 0.3, 0.45) * alive * 0.9;
    }

    updateBlocks(blocks.current, p, alive);
  });

  return (
    <group ref={stage}>
      <group ref={bezel} position={[0, 0, -0.022]}>
        <mesh>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#0d0d14"
            roughness={0.3}
            metalness={0.62}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      <group ref={sheet}>
        <SheetLayer map={maps.sketch} z={0} />
        <SheetLayer map={maps.annotations} z={0.0012} />
        <SheetLayer map={maps.title} z={0.0024} />
        {/* Un écran produit sa propre lumière : ces deux calques ne dépendent
            pas de l'éclairage du studio, sinon l'interface reste dans le noir. */}
        <SheetLayer map={maps.wireframe} z={0.0036} unlit />
        <SheetLayer map={maps.final} z={0.0048} unlit />
      </group>

      <group ref={blocks}>
        {BLOCKS.map((block, i) => (
          <mesh key={i} castShadow={quality.shadows}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#cdc2ad"
              roughness={0.6}
              metalness={0.1}
              transparent
              opacity={0}
              emissive="#3b0764"
              emissiveIntensity={0}
            />
            {/* La même arête lumineuse que les couches de la vue éclatée : un
                composant se reconnaît à son contour, pas à son aplat. */}
            <lineSegments geometry={blockOutline}>
              <lineBasicMaterial color="#c4b5fd" transparent opacity={0} />
            </lineSegments>
          </mesh>
        ))}
      </group>

      <pointLight ref={screenLight} position={[0, -0.35, 1.9]} color="#a78bfa" intensity={0} distance={5} />
    </group>
  );
}

function SheetLayer({ map, roughness = 0.88, z, unlit = false }) {
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[1, 1]} />
      {unlit ? (
        <meshBasicMaterial map={map} transparent opacity={0} depthWrite={false} />
      ) : (
        <meshStandardMaterial
          map={map}
          roughness={roughness}
          metalness={0.06}
          transparent
          opacity={0}
          depthWrite={false}
        />
      )}
    </mesh>
  );
}

function setLayerOpacity(mesh, opacity) {
  mesh.visible = opacity > 0.004;
  if (mesh.visible) mesh.material.opacity = opacity;
}

function updateBlocks(group, p, alive) {
  if (!group) return;

  const raised = between(p, 0.105, 0.2);
  const settled = between(p, 0.29, 0.36);
  const layout = between(p, 0.19, 0.31);
  const straight = between(p, 0.12, 0.25);
  const opacity = between(p, 0.1, 0.145) * (1 - between(p, 0.315, 0.385)) * alive;

  group.visible = opacity > 0.004;
  if (!group.visible) return;

  group.children.forEach((mesh, i) => {
    const { paper, screen, tilt } = BLOCKS[i];
    const stagger = 1 - i * 0.06;
    const lift = raised * stagger * (1 - settled);

    mesh.position.set(
      lerp(paper[0], screen[0], layout),
      lerp(paper[1], screen[1], layout),
      0.006 + lift * 0.16
    );
    mesh.scale.set(
      lerp(paper[2], screen[2], layout),
      lerp(paper[3], screen[3], layout),
      0.006 + lift * 0.035
    );
    mesh.rotation.z = tilt * (1 - straight);

    const material = mesh.material;
    material.opacity = opacity * (1 - straight * 0.2);
    material.color.copy(PAPER).lerp(GLASS, straight);
    material.emissiveIntensity = straight * 0.26;
    mesh.children[0].material.opacity = opacity * straight * 0.85;
  });
}
