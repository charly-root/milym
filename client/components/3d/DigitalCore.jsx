import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity } from "../../utils/math.js";
import { coreExplodeAmount } from "../../animations/digitalCoreTimeline.js";

const MODULES = [
  { label: "React", color: "#7c3aed" },
  { label: "Node.js", color: "#6d28d9" },
  { label: "API", color: "#8b5cf6" },
  { label: "Database", color: "#5b21b6" },
  { label: "AI", color: "#a78bfa" },
  { label: "Cloud", color: "#4c1d95" }
];

export function DigitalCore({ logoUrl, quality }) {
  const group = useRef();
  const inner = useRef();
  const modules = useRef();
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(logoUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      setLogo(texture);
    });
  }, [logoUrl]);

  const frame = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.15, 1.15, 1.15)), []);
  const frame2 = useMemo(() => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.82)), []);

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.78, 0.82, 0.92, 0.97);
    const explode = coreExplodeAmount(p);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y += delta * 0.18 * visible;
    if (inner.current) inner.current.rotation.x += delta * 0.22;
    if (modules.current) {
      modules.current.children.forEach((child, i) => {
        const base = (i / MODULES.length) * Math.PI * 2;
        const radius = 1.35 + explode * 0.85;
        child.position.set(Math.cos(base) * radius, Math.sin(base * 1.4) * 0.25 * explode, Math.sin(base) * radius);
      });
    }
  });

  return (
    <group ref={group} position={[0, 0.95, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color="#12081c"
          emissive="#6d28d9"
          emissiveIntensity={0.55}
          metalness={0.6}
          roughness={0.22}
        />
      </mesh>
      <mesh ref={inner}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#f5f3ff" emissive="#c4b5fd" emissiveIntensity={0.4} roughness={0.2} />
      </mesh>
      {logo && (
        <mesh position={[0, 0, 0.3]}>
          <planeGeometry args={[0.32, 0.32]} />
          <meshBasicMaterial map={logo} transparent />
        </mesh>
      )}
      <lineSegments geometry={frame} rotation={[0.4, 0.3, 0.2]}>
        <lineBasicMaterial color="#ddd6fe" transparent opacity={0.55} />
      </lineSegments>
      <lineSegments geometry={frame2} rotation={[0.2, 0.8, 0]}>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </lineSegments>
      <group ref={modules}>
        {MODULES.map((item, i) => {
          const a = (i / MODULES.length) * Math.PI * 2;
          return (
            <mesh key={item.label} position={[Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35]}>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
              <meshStandardMaterial
                color="#0f0f16"
                emissive={item.color}
                emissiveIntensity={0.25}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>
          );
        })}
      </group>
      {quality.particles > 20 && <CoreFibers />}
    </group>
  );
}

function CoreFibers() {
  const geom = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#c4b5fd" transparent opacity={0.25} />
    </lineSegments>
  );
}
