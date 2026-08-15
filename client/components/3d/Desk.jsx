import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { experienceStore } from "../../store.js";
import { between } from "../../utils/acts.js";
import { setGroupOpacity } from "../../utils/opacity.js";

/**
 * Le coin de table : la scène de départ. Elle s'efface dès que la feuille
 * quitte le bureau pour devenir un écran.
 */
export function Desk({ quality }) {
  const group = useRef();

  useFrame(() => {
    if (!group.current) return;
    setGroupOpacity(group.current, 1 - between(experienceStore.progress, 0.14, 0.26));
  });

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={quality.shadows}>
        <circleGeometry args={[6, 40]} />
        <meshStandardMaterial
          color="#0a0910"
          roughness={0.94}
          metalness={0.06}
          transparent
        />
      </mesh>

      <group position={[0.86, 0.024, 0.42]} rotation={[0, 0.5, Math.PI / 2]}>
        <mesh castShadow={quality.shadows}>
          <cylinderGeometry args={[0.021, 0.021, 0.78, 8]} />
          <meshStandardMaterial color="#1b151c" roughness={0.45} metalness={0.22} transparent />
        </mesh>
        <mesh position={[0, 0.43, 0]}>
          <coneGeometry args={[0.021, 0.1, 8]} />
          <meshStandardMaterial color="#d9c8a8" roughness={0.72} transparent />
        </mesh>
        <mesh position={[0, 0.47, 0]}>
          <coneGeometry args={[0.008, 0.035, 8]} />
          <meshStandardMaterial color="#2b241c" roughness={0.6} transparent />
        </mesh>
        <mesh position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.023, 0.023, 0.07, 8]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.5} transparent />
        </mesh>
      </group>

      {quality.extraLights && (
        <group position={[-0.95, 0.08, 0.5]}>
          <mesh castShadow={quality.shadows}>
            <cylinderGeometry args={[0.1, 0.085, 0.15, 18]} />
            <meshStandardMaterial color="#17141a" roughness={0.5} metalness={0.2} transparent />
          </mesh>
          <mesh position={[0.11, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.05, 0.011, 8, 18]} />
            <meshStandardMaterial color="#17141a" roughness={0.5} metalness={0.2} transparent />
          </mesh>
        </group>
      )}
    </group>
  );
}
