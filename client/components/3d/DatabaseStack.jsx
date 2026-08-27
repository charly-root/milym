import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { between } from "../../utils/acts.js";
import { lerp } from "../../utils/math.js";
import { setGroupOpacity } from "../../utils/opacity.js";
import { faceCamera } from "../../utils/billboard.js";
import { createCaptionTexture } from "../../utils/textures.js";

const PLATTERS = [
  { y: -0.42, r: 0.62 },
  { y: -0.21, r: 0.58 },
  { y: 0.0, r: 0.54 },
  { y: 0.21, r: 0.5 },
  { y: 0.42, r: 0.46 }
];

const ROWS = 5;
const COLS = 3;
const HEADERS = ["id", "nom", "statut"];

/**
 * Une table de lignes à gauche, la pile de disques à droite : on lit tout de
 * suite « des données, rangées, stockées ». En portrait, table au-dessus,
 * disques en dessous, pour remplir la hauteur.
 */
export function DatabaseStack({ quality }) {
  const group = useRef();
  const table = useRef();
  const spinner = useRef();
  const stackLabel = useRef();
  const tableLabel = useRef();
  const banner = useRef();
  const cells = useRef();
  const packets = useRef();
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tag = useMemo(() => createCaptionTexture("Database", "Stockage disque", "#fb7185"), []);
  const rowsTag = useMemo(() => createCaptionTexture("Table", "Enregistrements", "#c4b5fd"), []);
  const title = useMemo(
    () => createCaptionTexture("Base de données", "Lignes · index · persistance", "#f5d0fe"),
    []
  );
  const cellCount = ROWS * COLS;
  const packetCount = Math.max(16, Math.round(quality.particles / 2.2));

  useFrame(({ clock }) => {
    const p = experienceStore.progress;
    if (!group.current) return;

    const appear = between(p, 0.682, 0.724);
    const hold = 1 - between(p, 0.755, 0.788);
    const collapse = between(p, 0.82, 0.875);
    const opacity = appear * hold * (1 - collapse);
    setGroupOpacity(group.current, opacity);
    if (!group.current.visible) return;

    const portrait = experienceStore.portrait;
    group.current.position.z = lerp(STAGE.databaseZ, 0, collapse);
    group.current.scale.setScalar(lerp(0.86, portrait ? 0.9 : 1, appear) * (1 - collapse * 0.3));
    if (spinner.current) spinner.current.rotation.y += 0.01;
    if (stackLabel.current) faceCamera(stackLabel.current, camera);
    if (tableLabel.current) faceCamera(tableLabel.current, camera);
    if (banner.current) faceCamera(banner.current, camera);

    if (table.current) {
      table.current.position.set(portrait ? 0 : -0.15, portrait ? 0.82 : 0, 0);
    }
    if (spinner.current) {
      spinner.current.position.set(portrait ? 0 : 0.7, portrait ? -0.82 : 0, 0);
    }
    if (stackLabel.current) {
      stackLabel.current.position.set(portrait ? 0 : 0.7, portrait ? -0.22 : 0.78, 0.04);
    }
    if (tableLabel.current) {
      tableLabel.current.position.set(portrait ? 0 : -1.05, portrait ? 1.22 : 0.7, 0.14);
    }
    if (banner.current) {
      banner.current.position.set(0, portrait ? 1.38 : 1.05, 0.12);
    }

    const t = clock.elapsedTime;
    const scan = (t * 1.15) % ROWS;
    const tableX = portrait ? 0 : -0.15;

    if (cells.current) {
      for (let i = 0; i < cellCount; i++) {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const lit = 1 - Math.min(1, Math.abs(row - scan));
        dummy.position.set(tableX - 1.07 + col * 0.24, 0.32 - row * 0.18, 0.12);
        dummy.scale.set(0.2, 0.08, 0.06 + lit * 0.07);
        dummy.updateMatrix();
        cells.current.setMatrixAt(i, dummy.matrix);
      }
      cells.current.instanceMatrix.needsUpdate = true;
    }

    if (packets.current && spinner.current) {
      const spin = spinner.current.rotation.y;
      const origin = spinner.current.position;
      for (let i = 0; i < packetCount; i++) {
        const platter = PLATTERS[i % PLATTERS.length];
        const angle = t * (0.85 + (i % 3) * 0.14) + i * 0.9 + spin;
        dummy.position.set(
          origin.x + Math.cos(angle) * (platter.r * 0.74),
          origin.y + platter.y + 0.08,
          Math.sin(angle) * (platter.r * 0.74)
        );
        dummy.scale.setScalar(0.032);
        dummy.updateMatrix();
        packets.current.setMatrixAt(i, dummy.matrix);
      }
      packets.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={[STAGE.center[0], STAGE.center[1] - 0.02, STAGE.databaseZ]}>
      <group ref={table}>
        {HEADERS.map((header, col) => (
          <mesh key={header} position={[-1.07 + col * 0.24, 0.52, 0.12]}>
            <boxGeometry args={[0.2, 0.07, 0.05]} />
            <meshBasicMaterial color="#e9d5ff" transparent opacity={0.9} />
          </mesh>
        ))}
        {Array.from({ length: ROWS }, (_, row) => (
          <mesh key={row} position={[-0.83, 0.32 - row * 0.18, 0.1]}>
            <boxGeometry args={[0.78, 0.13, 0.045]} />
            <meshStandardMaterial
              color="#120e1c"
              emissive="#9f1239"
              emissiveIntensity={0.22}
              roughness={0.38}
              metalness={0.22}
              transparent
              opacity={0.94}
            />
          </mesh>
        ))}
        <instancedMesh ref={cells} args={[undefined, undefined, cellCount]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#fce7f3" transparent opacity={0.92} />
        </instancedMesh>
        <mesh ref={tableLabel} position={[-1.05, 0.7, 0.14]}>
          <planeGeometry args={[0.98, 0.22]} />
          <meshBasicMaterial map={rowsTag} transparent depthWrite={false} depthTest={false} />
        </mesh>
      </group>

      <group ref={spinner} position={[0.7, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 1.02, 12]} />
          <meshStandardMaterial
            color="#3f0d1c"
            metalness={0.6}
            roughness={0.25}
            emissive="#fb7185"
            emissiveIntensity={0.45}
            transparent
            opacity={0.96}
          />
        </mesh>
        {PLATTERS.map((platter) => (
          <group key={platter.y} position={[0, platter.y, 0]}>
            <mesh>
              <cylinderGeometry args={[platter.r, platter.r, 0.07, 48]} />
              <meshStandardMaterial
                color="#1a0c14"
                roughness={0.28}
                metalness={0.48}
                transparent
                opacity={0.96}
                emissive="#9f1239"
                emissiveIntensity={0.32}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[platter.r, 0.018, 8, 48]} />
              <meshBasicMaterial color="#fecdd3" transparent opacity={0.92} />
            </mesh>
          </group>
        ))}
      </group>

      <instancedMesh ref={packets} args={[undefined, undefined, packetCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#fff1f2" transparent opacity={0.98} />
      </instancedMesh>

      <mesh ref={stackLabel} position={[0.7, 0.78, 0]}>
        <planeGeometry args={[1.05, 0.22]} />
        <meshBasicMaterial map={tag} transparent depthWrite={false} depthTest={false} />
      </mesh>
      <mesh ref={banner} position={[0, 1.05, 0.12]}>
        <planeGeometry args={[1.45, 0.28]} />
        <meshBasicMaterial map={title} transparent depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}
