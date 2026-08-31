import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createChipTexture, loadWordmarkTexture } from "../../utils/textures.js";
import { coreOpenAmount, coreHubAmount } from "../../animations/digitalCoreTimeline.js";

/** Les pièces du produit, nommées par leur rôle — pas par un outil. */
const MODULES = [
  { label: "Frontend", color: "#7c3aed" },
  { label: "Interface", color: "#6d28d9" },
  { label: "Logique", color: "#8b5cf6" },
  { label: "Contrats", color: "#5b21b6" },
  { label: "Serveur", color: "#a78bfa" },
  { label: "Données", color: "#4c1d95" }
];

const RADIUS = 1.15;
const RING_TILT = [0.72, 0.1, 0.18];

/**
 * Le cœur : une planète lumineuse, un anneau, des pièces en orbite.
 * Le cran « Tout se rassemble » se pose sur ce plan, déjà ouvert.
 */
export function DigitalCore({ quality }) {
  const group = useRef();
  const shell = useRef();
  const modules = useRef();
  const badge = useRef();
  const heart = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const ringC = useRef();
  const { camera } = useThree();
  const [logo, setLogo] = useState(null);
  const [logoAspect, setLogoAspect] = useState(699 / 184);

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
    loadWordmarkTexture()
      .then(({ texture, aspect }) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        setLogo(texture);
        setLogoAspect(aspect);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.828, 0.862);
    const leave = between(p, 0.938, 0.962);
    setGroupOpacity(group.current, appear * (1 - leave));
    if (!group.current.visible) return;

    const open = coreOpenAmount(p);
    const hub = coreHubAmount(p);
    const travel = between(p, 0.855, 0.888);
    const born = appear;

    const fromX = 0;
    const fromY = STAGE.center[1] + 0.08;
    const fromZ = STAGE.aiZ;
    group.current.position.set(
      lerp(fromX, STAGE.center[0], travel),
      lerp(fromY, STAGE.center[1], travel),
      lerp(fromZ, STAGE.center[2], travel)
    );

    const ignition = Math.sin(Math.PI * between(p, 0.86, 0.93));
    if (heart.current) heart.current.emissiveIntensity = 0.85 + ignition * 3.8 + open * 1.4;

    group.current.scale.setScalar(lerp(0.22, 1, born) * lerp(1, 0.62, hub) * (1 - leave));
    if (modules.current) modules.current.rotation.y += delta * 0.22;
    if (shell.current) {
      shell.current.rotation.x += delta * 0.08;
      shell.current.rotation.y += delta * 0.11;
    }
    if (badge.current) {
      badge.current.visible = open < 0.22;
      if (badge.current.visible) faceCamera(badge.current, camera);
    }

    const ringScale = 0.2 + open * 0.8;
    const ringOpacity = open * 0.92;
    const spin = delta * (0.12 + open * 0.18);
    [ringA, ringB, ringC].forEach((ring, i) => {
      if (!ring.current) return;
      ring.current.visible = open > 0.02;
      ring.current.scale.setScalar(ringScale * (1 + i * 0.08));
      ring.current.rotation.z += spin * (i === 1 ? -0.7 : 1);
      if (ring.current.material) ring.current.material.opacity = ringOpacity * (i === 0 ? 1 : 0.55);
    });

    modules.current?.children.forEach((module, i) => {
      const angle = (i / MODULES.length) * Math.PI * 2;
      const radius = lerp(0.22, RADIUS + open * 0.28, open);
      module.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * 0.08 * open,
        Math.sin(angle) * radius
      );
      module.scale.setScalar(lerp(0.2, 0.85, open));
      module.visible = open > 0.04;
      const chip = module.children[1];
      if (chip) {
        chip.visible = open > 0.12;
        chip.material.opacity = open;
        if (chip.visible) faceCamera(chip, camera);
      }
    });
  });

  return (
    <group ref={group} position={[0, STAGE.center[1] + 0.08, STAGE.aiZ]}>
      <mesh castShadow={quality.shadows}>
        <sphereGeometry args={[0.42, 32, 24]} />
        <meshStandardMaterial
          ref={heart}
          color="#1a0a28"
          emissive="#7c3aed"
          emissiveIntensity={0.85}
          metalness={0.35}
          roughness={0.28}
          transparent
        />
      </mesh>
      <pointLight color="#c4b5fd" intensity={2.4} distance={6} decay={2} />

      <mesh ref={shell}>
        <sphereGeometry args={[0.58, 24, 18]} />
        <meshPhysicalMaterial
          color="#1a1030"
          roughness={0.08}
          metalness={0.45}
          transparent
          opacity={0.22}
          transmission={quality.transmission ? 0.55 : 0}
          thickness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments geometry={cage} rotation={[0.3, 0.4, 0.1]}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.16} />
      </lineSegments>

      <lineSegments geometry={fibers}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.18} />
      </lineSegments>

      <mesh ref={ringA} rotation={RING_TILT} visible={false}>
        <torusGeometry args={[1.42, 0.055, 10, 96]} />
        <meshBasicMaterial
          color="#f3e8ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ringB} rotation={RING_TILT} visible={false}>
        <torusGeometry args={[1.68, 0.022, 8, 80]} />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ringC} rotation={RING_TILT} visible={false}>
        <torusGeometry args={[1.18, 0.016, 8, 72]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {logo && (
        <mesh key={logoAspect} ref={badge} position={[0, 0, 0.66]}>
          <planeGeometry args={[0.92, 0.92 / logoAspect]} />
          <meshBasicMaterial map={logo} transparent depthWrite={false} depthTest={false} />
        </mesh>
      )}

      <group ref={modules}>
        {MODULES.map((module, i) => {
          const angle = (i / MODULES.length) * Math.PI * 2;
          return (
            <group key={module.label} position={[Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS]}>
              <mesh castShadow={quality.shadows}>
                <boxGeometry args={[0.22, 0.22, 0.22]} />
                <meshStandardMaterial
                  color="#0f0f16"
                  emissive={module.color}
                  emissiveIntensity={0.4}
                  metalness={0.5}
                  roughness={0.3}
                  transparent
                />
              </mesh>
              <mesh position={[0, 0.22, 0]}>
                <planeGeometry args={[0.48, 0.1]} />
                <meshBasicMaterial map={chips[i]} transparent opacity={0} depthWrite={false} depthTest={false} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
