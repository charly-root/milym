import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity, smoothstep } from "../../utils/math.js";
import { createPaperTexture, createDigitalTexture } from "../../utils/textures.js";

export function IdeaPaper({ quality }) {
  const group = useRef();
  const paper = useRef();
  const paperTex = useMemo(() => createPaperTexture(), []);
  const digitalTex = useMemo(() => createDigitalTexture(), []);

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0, 0, 0.28, 0.4);
    const mix = smoothstep(0.12, 0.32, p);
    const lift = smoothstep(0.1, 0.26, p);
    if (group.current) group.current.visible = visible > 0.01;
    if (!group.current?.visible) return;

    group.current.position.y = 0.02 + mix * 0.35;
    if (paper.current) {
      const paperMat = paper.current.children[0]?.material;
      const digitalMat = paper.current.children[1]?.material;
      if (paperMat) paperMat.opacity = (1 - mix) * visible;
      if (digitalMat) digitalMat.opacity = mix * visible;
      const wrinkle = (1 - mix) * 0.012;
      const t = clock.elapsedTime;
      paper.current.rotation.z = Math.sin(t * 0.15) * 0.01 * (1 - mix);
      paper.current.position.z = Math.sin(t * 0.4) * wrinkle;
    }

    group.current.userData.lift = lift;
    group.current.userData.mix = mix;
    group.current.userData.visible = visible;
  });

  return (
    <group ref={group}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow={quality.shadows}
      >
        <circleGeometry args={[7.5, 48]} />
        <meshStandardMaterial color="#09080c" roughness={0.92} metalness={0.08} />
      </mesh>

      <group rotation={[-Math.PI / 2, 0, -0.06]} position={[0, 0.025, 0]}>
        <group ref={paper}>
          <mesh castShadow receiveShadow>
            <planeGeometry args={[1.52, 1.95, 24, 32]} />
            <meshStandardMaterial
              map={paperTex}
              roughness={0.86}
              metalness={0}
              transparent
              opacity={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[1.52, 1.95, 1, 1]} />
            <meshStandardMaterial
              map={digitalTex}
              roughness={0.28}
              metalness={0.15}
              transparent
              opacity={0}
              emissive="#3b1d6e"
              emissiveIntensity={0.08}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        <SketchBlocks />
      </group>

      <Pencil />
      {quality.extraLights && <Cup />}
    </group>
  );
}

function SketchBlocks() {
  const ref = useRef();

  useFrame(() => {
    const p = experienceStore.progress;
    const lift = smoothstep(0.1, 0.28, p) * 0.18;
    const opacity = rangeOpacity(p, 0.08, 0.14, 0.3, 0.4);
    const straighten = smoothstep(0.12, 0.26, p);
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      child.position.z = 0.02 + lift * (0.55 + i * 0.12);
      child.rotation.z = (1 - straighten) * child.userData.tilt;
      child.material.opacity = opacity;
      child.material.color.setHSL(0.75, 0.15 + straighten * 0.35, 0.22 + straighten * 0.18);
    });
  });

  const blocks = [
    { position: [0, 0.72, 0], size: [1.28, 0.14, 0.02], tilt: -0.02 },
    { position: [0, 0.38, 0], size: [0.9, 0.1, 0.02], tilt: 0.015 },
    { position: [0, 0.18, 0], size: [0.32, 0.09, 0.025], tilt: -0.01 },
    { position: [-0.32, -0.18, 0], size: [0.58, 0.38, 0.03], tilt: 0.02 },
    { position: [0.34, -0.18, 0], size: [0.58, 0.38, 0.03], tilt: -0.018 }
  ];

  return (
    <group ref={ref}>
      {blocks.map((block) => (
        <mesh
          key={block.position.join(",")}
          position={block.position}
          userData={{ tilt: block.tilt }}
          rotation={[0, 0, block.tilt]}
        >
          <boxGeometry args={block.size} />
          <meshStandardMaterial
            color="#2a2420"
            transparent
            opacity={0}
            roughness={0.45}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Pencil() {
  return (
    <group position={[0.92, 0.05, 0.62]} rotation={[0, 0.55, Math.PI / 2.05]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.92, 8]} />
        <meshStandardMaterial color="#1b151c" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.022, 0.11, 8]} />
        <meshStandardMaterial color="#d7c4a3" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <coneGeometry args={[0.008, 0.04, 8]} />
        <meshStandardMaterial color="#2b241c" />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.08, 8]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Cup() {
  return (
    <group position={[-1.15, 0.08, 0.55]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.11, 0.09, 0.16, 16]} />
        <meshStandardMaterial color="#1a1714" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0.12, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.055, 0.012, 8, 16]} />
        <meshStandardMaterial color="#1a1714" roughness={0.55} metalness={0.15} />
      </mesh>
    </group>
  );
}
