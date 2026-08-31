import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { EARTH, METEOR } from "../stage.js";
import { lerp, smoothstep } from "../utils/math.js";

/**
 * Une météorite enflammée, déjà dans le cadre dès l'ouverture. Elle traverse
 * le ciel au-dessus de la Terre, s'agrandit, et percute au moment de la
 * détonation — la chute doit se lire, pas se deviner.
 */
const START = new THREE.Vector3(1.55, 5.35, 28.5);
const IMPACT = new THREE.Vector3(
  EARTH.center[0] + 0.12,
  EARTH.center[1] + 0.28,
  EARTH.center[2] + EARTH.radius * 0.95
);

const TRAIL = 36;
const DUMMY = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _ahead = new THREE.Vector3();
const _trail = new THREE.Vector3();

function createFireTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,252,235,1)");
  g.addColorStop(0.22, "rgba(255,180,70,0.95)");
  g.addColorStop(0.55, "rgba(255,80,24,0.4)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function samplePath(u, target) {
  const rush = Math.pow(u, 1.28);
  const arc = Math.sin(rush * Math.PI) * 0.85;
  return target.set(
    lerp(START.x, IMPACT.x, rush),
    lerp(START.y, IMPACT.y, rush) + arc,
    lerp(START.z, IMPACT.z, rush)
  );
}

export function Meteorite() {
  const group = useRef();
  const glow = useRef();
  const halo = useRef();
  const trail = useRef();
  const fire = useMemo(createFireTexture, []);

  useFrame(({ clock }) => {
    const raw = experienceStore.rawProgress;
    const visible = raw < METEOR.strike + 0.006;
    if (group.current) group.current.visible = visible;
    if (glow.current) glow.current.visible = visible;
    if (halo.current) halo.current.visible = visible;
    if (trail.current) trail.current.visible = visible;
    if (!visible) return;

    const u = smoothstep(METEOR.appear, METEOR.strike, raw);
    samplePath(u, _pos);
    if (u < 0.96) {
      samplePath(u + 0.04, _ahead);
      group.current.position.copy(_pos);
      group.current.lookAt(_ahead);
    } else {
      samplePath(0.92, _ahead);
      group.current.position.copy(_ahead);
      group.current.lookAt(_pos);
      group.current.position.copy(_pos);
    }
    group.current.rotateX(Math.PI / 2);
    const size = lerp(0.72, 1.15, Math.pow(u, 1.15));
    group.current.scale.setScalar(size);

    glow.current.position.copy(_pos);
    const pulse = 1 + Math.sin(clock.elapsedTime * 11) * 0.1;
    glow.current.scale.setScalar(size * 2.8 * pulse);
    glow.current.material.opacity = 0.55 + u * 0.4;

    halo.current.position.copy(_pos);
    halo.current.scale.setScalar(size * 5.2 * pulse);
    halo.current.material.opacity = 0.22 + u * 0.18;

    for (let i = 0; i < TRAIL; i++) {
      const back = (i + 1) / TRAIL;
      samplePath(Math.max(0, u - back * 0.16), _trail);
      DUMMY.position.copy(_trail);
      DUMMY.scale.setScalar((0.1 + (1 - back) * 0.38) * (0.7 + u * 0.5));
      DUMMY.updateMatrix();
      trail.current.setMatrixAt(i, DUMMY.matrix);
    }
    trail.current.instanceMatrix.needsUpdate = true;
    trail.current.material.opacity = 0.35 + u * 0.5;
  });

  return (
    <group>
      <group ref={group} visible={false}>
        <mesh>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#2a140c"
            roughness={0.88}
            flatShading
            emissive="#ff6a20"
            emissiveIntensity={1.6}
            fog={false}
          />
        </mesh>
        <mesh position={[0, -1.55, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.55, 3.4, 10, 1, true]} />
          <meshBasicMaterial
            color={[3.2, 1.25, 0.28]}
            transparent
            opacity={0.7}
            depthWrite={false}
            fog={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight color="#ff9a40" intensity={18} distance={22} decay={2} />
      </group>
      <sprite ref={glow} visible={false} scale={[2.2, 2.2, 1]}>
        <spriteMaterial
          map={fire}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          opacity={0.7}
        />
      </sprite>
      <sprite ref={halo} visible={false} scale={[4, 4, 1]}>
        <spriteMaterial
          map={fire}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          opacity={0.25}
        />
      </sprite>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={[3.0, 1.25, 0.28]}
          transparent
          opacity={0.55}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}
