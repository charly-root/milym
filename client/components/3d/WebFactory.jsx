import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { rangeOpacity, smoothstep } from "../../utils/math.js";
import { createLabelTexture } from "../../utils/textures.js";

const LAYERS = [
  { title: "UI", sub: "Interface" },
  { title: "React", sub: "Components" },
  { title: "Logic", sub: "State" },
  { title: "API", sub: "Gateway" },
  { title: "Node.js", sub: "Backend" },
  { title: "Database", sub: "Storage" }
];

export function WebFactory({ quality }) {
  const group = useRef();
  const textures = useMemo(
    () => LAYERS.map((layer) => createLabelTexture(layer.title, layer.sub)),
    []
  );

  useFrame((_, delta) => {
    const p = experienceStore.progress;
    const visible = rangeOpacity(p, 0.46, 0.52, 0.62, 0.7);
    const explode = smoothstep(0.48, 0.58, p);
    if (!group.current) return;
    group.current.visible = visible > 0.01;
    group.current.rotation.y += delta * 0.08 * visible;
    group.current.children.forEach((child) => {
      if (child.userData.index == null) return;
      const z = (child.userData.index - 2.5) * (0.18 + explode * 0.22);
      child.position.z = z;
    });
  });

  return (
    <group ref={group} position={[0, 1.05, 0]}>
      {LAYERS.map((layer, i) => (
        <group key={layer.title} userData={{ index: i }} position={[0, 0, (i - 2.5) * 0.18]}>
          <mesh>
            <planeGeometry args={[2.1, 1.15]} />
            <meshPhysicalMaterial
              color="#120c1c"
              roughness={0.18}
              metalness={0.35}
              transparent
              opacity={0.4}
              transmission={quality.transmission ? 0.28 : 0}
              thickness={0.35}
              emissive="#3b0764"
              emissiveIntensity={0.08}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[1.6, 0.8]} />
            <meshBasicMaterial map={textures[i]} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
      <FactoryLinks />
    </group>
  );
}

function FactoryLinks() {
  const points = useMemo(() => {
    const list = [];
    for (let i = 0; i < 5; i++) {
      list.push(new THREE.Vector3(-0.7, 0.2, (i - 2.5) * 0.18));
      list.push(new THREE.Vector3(-0.7, 0.2, (i - 1.5) * 0.18));
    }
    return list;
  }, []);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#c4b5fd" transparent opacity={0.35} />
    </lineSegments>
  );
}
