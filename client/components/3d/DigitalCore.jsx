import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createChipTexture, loadBadgeTexture } from "../../utils/textures.js";
import { coreOpenAmount, coreHubAmount } from "../../animations/digitalCoreTimeline.js";

/** Chaque module a un rôle : ce sont les pièces du produit, pas des logos. */
const MODULES = [
  { label: "React", color: "#7c3aed" },
  { label: "Node.js", color: "#6d28d9" },
  { label: "API", color: "#8b5cf6" },
  { label: "Database", color: "#5b21b6" },
  { label: "IA", color: "#a78bfa" },
  { label: "Cloud", color: "#4c1d95" }
];

const RADIUS = 1.15;

/**
 * Le noyau : tout ce qu'on vient de traverser, assemblé. Il s'ouvre pour
 * montrer ses pièces, puis se referme.
 */
export function DigitalCore({ logoUrl, quality }) {
  const group = useRef();
  const shell = useRef();
  const modules = useRef();
  const badge = useRef();
  const { camera } = useThree();
  const [logo, setLogo] = useState(null);

  const chips = useMemo(() => MODULES.map((m) => createChipTexture(m.label)), []);
  const cage = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.78, 0)), []);
  const fibers = useMemo(() => {
    const points = [];
    MODULES.forEach((_, i) => {
      const angle = (i / MODULES.length) * Math.PI * 2;
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS));
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBadgeTexture(logoUrl)
      .then((texture) => {
        if (cancelled) texture.dispose();
        else setLogo(texture);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.795, 0.845);
    const leave = between(p, 0.955, 0.985);
    setGroupOpacity(group.current, appear * (1 - leave));
    if (!group.current.visible) return;

    const open = coreOpenAmount(p);
    const hub = coreHubAmount(p);

    group.current.scale.setScalar(lerp(1, 0.52, hub));
    // Seuls les modules tournent : le logo doit rester lisible de face.
    modules.current.rotation.y += delta * 0.16;
    shell.current.rotation.x += delta * 0.1;
    shell.current.rotation.y += delta * 0.07;
    if (badge.current) faceCamera(badge.current, camera);

    modules.current?.children.forEach((module, i) => {
      const angle = (i / MODULES.length) * Math.PI * 2;
      const radius = RADIUS + open * 0.55;
      module.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 1.6) * 0.3 * open,
        Math.sin(angle) * radius
      );
      const chip = module.children[1];
      if (chip) {
        chip.visible = open > 0.05;
        chip.material.opacity = open;
        if (chip.visible) faceCamera(chip, camera);
      }
    });
  });

  return (
    <group ref={group} position={STAGE.center}>
      <mesh castShadow={quality.shadows}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color="#12081c"
          emissive="#6d28d9"
          emissiveIntensity={0.6}
          metalness={0.62}
          roughness={0.22}
          transparent
        />
      </mesh>

      <mesh ref={shell}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshPhysicalMaterial
          color="#1a1030"
          roughness={0.12}
          metalness={0.4}
          transparent
          opacity={0.28}
          transmission={quality.transmission ? 0.4 : 0}
          thickness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments geometry={cage} rotation={[0.3, 0.4, 0.1]}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.22} />
      </lineSegments>

      <lineSegments geometry={fibers}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.22} />
      </lineSegments>

      {logo && (
        <mesh ref={badge} position={[0, 0, 0.66]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial map={logo} transparent depthWrite={false} depthTest={false} />
        </mesh>
      )}

      <group ref={modules}>
        {MODULES.map((module, i) => {
          const angle = (i / MODULES.length) * Math.PI * 2;
          return (
            <group key={module.label} position={[Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS]}>
              <mesh castShadow={quality.shadows}>
                <boxGeometry args={[0.26, 0.26, 0.26]} />
                <meshStandardMaterial
                  color="#0f0f16"
                  emissive={module.color}
                  emissiveIntensity={0.32}
                  metalness={0.5}
                  roughness={0.3}
                  transparent
                />
              </mesh>
              <mesh position={[0, 0.24, 0]}>
                <planeGeometry args={[0.32, 0.096]} />
                <meshBasicMaterial map={chips[i]} transparent opacity={0} depthWrite={false} depthTest={false} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
