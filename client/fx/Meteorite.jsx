import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { EARTH, METEOR, BOOM } from "../stage.js";
import { lerp, smoothstep } from "../utils/math.js";

/**
 * Une météorite enflammée qui fonce sur la Terre. Elle part loin derrière la
 * caméra d'ouverture et percute au moment de la détonation.
 */
const START = new THREE.Vector3(7.2, 4.8, 38);
const IMPACT = new THREE.Vector3(
  EARTH.center[0] + 0.15,
  EARTH.center[1] + 0.35,
  EARTH.center[2] + EARTH.radius * 0.92
);

const DUMMY = new THREE.Object3D();
const TRAIL = 28;

function createFireTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,250,230,1)");
  g.addColorStop(0.25, "rgba(255,170,60,0.95)");
  g.addColorStop(0.6, "rgba(255,70,20,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Meteorite() {
  const rock = useRef();
  const glow = useRef();
  const trail = useRef();
  const fire = useMemo(createFireTexture, []);
  const seeds = useMemo(() => Array.from({ length: TRAIL }, () => Math.random()), []);

  useFrame(({ clock }) => {
    const raw = experienceStore.rawProgress;
    const incoming = raw < METEOR.strike + 0.002;
    const visible = incoming && raw < BOOM.end;
    if (rock.current) rock.current.visible = visible;
    if (glow.current) glow.current.visible = visible;
    if (trail.current) trail.current.visible = visible;
    if (!visible) return;

    const u = smoothstep(METEOR.appear, METEOR.strike, raw);
    // Accélération : elle reste lisible longtemps, puis plonge.
    const rush = u * u;
    const x = lerp(START.x, IMPACT.x, rush);
    const y = lerp(START.y, IMPACT.y, rush);
    const z = lerp(START.z, IMPACT.z, rush);

    rock.current.position.set(x, y, z);
    rock.current.rotation.x += 0.08;
    rock.current.rotation.z += 0.05;
    const size = lerp(0.42, 0.95, rush);
    rock.current.scale.setScalar(size);

    glow.current.position.set(x, y, z);
    glow.current.scale.setScalar(size * (2.4 + Math.sin(clock.elapsedTime * 18) * 0.25));
    glow.current.material.opacity = 0.55 + rush * 0.4;

    const t = clock.elapsedTime;
    for (let i = 0; i < TRAIL; i++) {
      const back = (i + 1) / TRAIL;
      const tu = Math.max(0, rush - back * 0.08);
      DUMMY.position.set(
        lerp(START.x, IMPACT.x, tu) + Math.sin(t * 9 + seeds[i] * 6) * 0.08,
        lerp(START.y, IMPACT.y, tu) + Math.cos(t * 7 + seeds[i] * 4) * 0.08,
        lerp(START.z, IMPACT.z, tu)
      );
      DUMMY.scale.setScalar(0.12 + (1 - back) * 0.28);
      DUMMY.updateMatrix();
      trail.current.setMatrixAt(i, DUMMY.matrix);
    }
    trail.current.instanceMatrix.needsUpdate = true;
    trail.current.material.opacity = 0.35 + rush * 0.5;
  });

  return (
    <group>
      <mesh ref={rock} visible={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#2a1810"
          roughness={0.9}
          flatShading
          emissive="#ff5a18"
          emissiveIntensity={1.4}
          fog={false}
        />
      </mesh>
      <sprite ref={glow} visible={false} scale={[1.4, 1.4, 1]}>
        <spriteMaterial
          map={fire}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </sprite>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={[3.2, 1.3, 0.35]}
          transparent
          opacity={0.5}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}
