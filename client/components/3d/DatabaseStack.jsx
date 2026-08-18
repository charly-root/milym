import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createTagTexture } from "../../utils/textures.js";

const PLATTERS = [
  { y: -0.42, r: 0.62 },
  { y: -0.21, r: 0.58 },
  { y: 0.0, r: 0.54 },
  { y: 0.21, r: 0.5 },
  { y: 0.42, r: 0.46 }
];

const ROWS = 5;
const COLS = 3;

/**
 * Une table de lignes à gauche, la pile de disques à droite : on lit tout de
 * suite « des données, rangées, stockées ».
 */
export function DatabaseStack({ quality }) {
  const group = useRef();
  const spinner = useRef();
  const stackLabel = useRef();
  const tableLabel = useRef();
  const cells = useRef();
  const packets = useRef();
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tag = useMemo(() => createTagTexture("Database", "Stockage"), []);
  const rowsTag = useMemo(() => createTagTexture("Table", "Enregistrements"), []);
  const cellCount = ROWS * COLS;
  const packetCount = Math.max(8, Math.round(quality.particles / 3));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.688, 0.728);
    const hold = 1 - between(p, 0.752, 0.782);
    const collapse = between(p, 0.82, 0.875);
    const opacity = appear * hold * (1 - collapse);
    setGroupOpacity(group.current, opacity);
    if (!group.current.visible) return;

    group.current.position.z = lerp(STAGE.databaseZ, 0, collapse);
    group.current.scale.setScalar(lerp(0.86, 1, appear) * (1 - collapse * 0.3));
    if (spinner.current) spinner.current.rotation.y += 0.007;
    if (stackLabel.current) faceCamera(stackLabel.current, camera);
    if (tableLabel.current) faceCamera(tableLabel.current, camera);

    const t = clock.elapsedTime;
    const scan = (t * 1.15) % ROWS;

    if (cells.current) {
      for (let i = 0; i < cellCount; i++) {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const lit = 1 - Math.min(1, Math.abs(row - scan));
        dummy.position.set(-1.22 + col * 0.22, 0.36 - row * 0.18, 0.12);
        dummy.scale.set(0.18, 0.07, 0.06 + lit * 0.05);
        dummy.updateMatrix();
        cells.current.setMatrixAt(i, dummy.matrix);
      }
      cells.current.instanceMatrix.needsUpdate = true;
    }

    if (packets.current) {
      const spin = spinner.current?.rotation.y || 0;
      for (let i = 0; i < packetCount; i++) {
        const platter = PLATTERS[i % PLATTERS.length];
        const angle = t * (0.7 + (i % 3) * 0.12) + i * 0.9 + spin;
        dummy.position.set(
          0.55 + Math.cos(angle) * (platter.r * 0.74),
          platter.y + 0.08,
          Math.sin(angle) * (platter.r * 0.74)
        );
        dummy.scale.setScalar(0.028);
        dummy.updateMatrix();
        packets.current.setMatrixAt(i, dummy.matrix);
      }
      packets.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1] - 0.02, STAGE.databaseZ]}>
      <group>
        {Array.from({ length: ROWS }, (_, row) => (
          <mesh key={row} position={[-1.0, 0.36 - row * 0.18, 0.1]}>
            <boxGeometry args={[0.68, 0.11, 0.04]} />
            <meshStandardMaterial
              color="#120e1c"
              emissive="#4c1d95"
              emissiveIntensity={0.18}
              roughness={0.4}
              metalness={0.2}
              transparent
              opacity={0.92}
            />
          </mesh>
        ))}
        <instancedMesh ref={cells} args={[undefined, undefined, cellCount]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#e9d5ff" transparent opacity={0.85} />
        </instancedMesh>
        <mesh ref={tableLabel} position={[-1.0, 0.62, 0.12]}>
          <planeGeometry args={[0.78, 0.16]} />
          <meshBasicMaterial map={rowsTag} transparent depthWrite={false} depthTest={false} />
        </mesh>
      </group>

      <group ref={spinner} position={[0.55, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 1.02, 12]} />
          <meshStandardMaterial
            color="#2e1064"
            metalness={0.6}
            roughness={0.25}
            emissive="#7c3aed"
            emissiveIntensity={0.35}
            transparent
            opacity={0.96}
          />
        </mesh>
        {PLATTERS.map((platter) => (
          <group key={platter.y} position={[0, platter.y, 0]}>
            <mesh>
              <cylinderGeometry args={[platter.r, platter.r, 0.07, 48]} />
              <meshStandardMaterial
                color="#161022"
                roughness={0.32}
                metalness={0.42}
                transparent
                opacity={0.96}
                emissive="#3b0764"
                emissiveIntensity={0.22}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[platter.r, 0.015, 8, 48]} />
              <meshBasicMaterial color="#ddd6fe" transparent opacity={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      <instancedMesh ref={packets} args={[undefined, undefined, packetCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#f5e9ff" transparent opacity={0.95} />
      </instancedMesh>

      <mesh ref={stackLabel} position={[0.55, 0.72, 0]}>
        <planeGeometry args={[0.78, 0.16]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
