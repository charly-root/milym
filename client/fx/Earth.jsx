import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { EARTH, BOOM, FLASH, PROLOGUE } from "../stage.js";
import { smoothstep } from "../utils/math.js";

/**
 * Prologue : la France de nuit, déjà face caméra. Chauffe discrète, impact,
 * quelques débris lisibles, puis fondu avant le bureau — plus de soupe de
 * particules ni de boule de feu qui noie l'image.
 */
function createGlowTexture(inner, mid) {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.5, mid);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRimTexture() {
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.62, "rgba(0,0,0,0)");
  gradient.addColorStop(0.74, "rgba(158,128,255,0.55)");
  gradient.addColorStop(0.88, "rgba(96,64,208,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function randomDirection() {
  const u = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, u);
}

const DUMMY = new THREE.Object3D();
const NIGHT_COLOR = new THREE.Color(1.65, 1.65, 2.05);
const MAGMA_COLOR = new THREE.Color(2.2, 1.15, 0.7);

export function Earth() {
  const group = useRef();
  const sphere = useRef();
  const marker = useRef();
  const atmo = useRef();
  const heat = useRef();
  const flare = useRef();
  const rocks = useRef();
  const embers = useRef();
  const lava = useRef();
  const fire = useRef();

  const night = useLoader(THREE.TextureLoader, "/textures/earth-night.jpg");
  night.colorSpace = THREE.SRGBColorSpace;
  night.anisotropy = 8;
  night.minFilter = THREE.LinearMipmapLinearFilter;
  night.magFilter = THREE.LinearFilter;

  const atmosphere = useMemo(createRimTexture, []);
  const beacon = useMemo(() => createGlowTexture("rgba(255,250,255,1)", "rgba(196,166,255,0.45)"), []);
  const magma = useMemo(() => createGlowTexture("rgba(255,214,150,1)", "rgba(255,96,28,0.4)"), []);
  const blast = useMemo(() => createGlowTexture("rgba(255,247,230,1)", "rgba(255,150,60,0.5)"), []);
  const spark = useMemo(() => createGlowTexture("rgba(255,236,200,1)", "rgba(255,110,40,0.7)"), []);

  const mobile = experienceStore.tier === "mobile";
  const counts = useMemo(
    () => ({ rocks: mobile ? 28 : 48, embers: mobile ? 22 : 36, lava: mobile ? 140 : 240 }),
    [mobile]
  );

  const shards = useMemo(() => {
    const make = (count, fast) =>
      Array.from({ length: count }, () => ({
        dir: randomDirection(),
        speed: (fast ? 0.85 : 0.55) + Math.random() * (fast ? 0.7 : 0.55),
        axis: randomDirection(),
        tumble: (Math.random() - 0.5) * 8,
        scale: (fast ? 0.22 : 0.48) + Math.random() * (fast ? 0.22 : 0.72)
      }));
    return { rocks: make(counts.rocks, false), embers: make(counts.embers, true) };
  }, [counts]);

  const burst = useMemo(() => {
    const dirs = new Float32Array(counts.lava * 3);
    const speeds = new Float32Array(counts.lava);
    const positions = new Float32Array(counts.lava * 3);
    for (let i = 0; i < counts.lava; i++) {
      const d = randomDirection();
      dirs.set([d.x, d.y, d.z], i * 3);
      speeds[i] = 0.4 + Math.pow(Math.random(), 1.8) * 1.6;
    }
    return { dirs, speeds, positions };
  }, [counts]);

  const francePoint = useMemo(
    () => new THREE.Vector3(...EARTH.france).multiplyScalar(EARTH.radius * 1.01),
    []
  );

  useFrame(({ clock, camera }) => {
    const raw = experienceStore.rawProgress;
    if (!group.current) return;

    const fade = 1 - smoothstep(FLASH.start, FLASH.peak, raw);
    group.current.visible = raw < PROLOGUE && fade > 0.02;
    if (!group.current.visible) return;

    const t = clock.elapsedTime;
    const heatAmount = smoothstep(BOOM.heatStart, BOOM.start, raw);
    const boom = smoothstep(BOOM.start, BOOM.end, raw);
    const blastEase = 1 - Math.pow(1 - boom, 2.4);
    const exploded = raw >= BOOM.start;

    sphere.current.visible = !exploded;
    atmo.current.visible = !exploded;
    if (!exploded) {
      sphere.current.rotation.y = t * 0.035;
      const tremor = 1 + heatAmount * Math.sin(t * 18) * 0.006;
      sphere.current.scale.setScalar(tremor);
      sphere.current.material.color.copy(NIGHT_COLOR).lerp(MAGMA_COLOR, heatAmount * 0.7);

      const focus = 1 - smoothstep(BOOM.heatStart + 0.006, BOOM.start - 0.006, raw);
      const pulse = 1 + Math.sin(t * 3.2) * 0.12;
      marker.current.material.opacity = focus * 0.7 * fade;
      marker.current.scale.setScalar(0.38 * pulse);
      marker.current.quaternion.copy(camera.quaternion);

      atmo.current.material.opacity = (1 - heatAmount * 0.25) * fade;
      atmo.current.quaternion.copy(camera.quaternion);
    }

    const heatGlow = heatAmount * (1 - smoothstep(BOOM.start, BOOM.start + 0.008, raw));
    heat.current.visible = heatGlow > 0.004;
    if (heat.current.visible) {
      heat.current.material.opacity = heatGlow * 0.32 * fade;
      heat.current.scale.setScalar(EARTH.radius * (1.55 + heatAmount * 0.35));
      heat.current.quaternion.copy(camera.quaternion);
    }

    const flareIn = smoothstep(BOOM.start, BOOM.start + 0.005, raw);
    const pop = flareIn * (1 - smoothstep(BOOM.start + 0.005, BOOM.start + 0.018, raw));
    const coreGlow = flareIn * 0.28 * (1 - boom);
    const flareAmount = (pop + coreGlow) * fade;
    flare.current.visible = flareAmount > 0.004;
    if (flare.current.visible) {
      flare.current.material.opacity = flareAmount;
      flare.current.scale.setScalar(EARTH.radius * (0.85 + blastEase * 1.8));
      flare.current.quaternion.copy(camera.quaternion);
    }

    const debrisAlive = exploded && fade > 0.02;
    rocks.current.visible = debrisAlive;
    embers.current.visible = debrisAlive;
    if (debrisAlive) {
      const write = (mesh, list, reach, shrink) => {
        list.forEach((shard, i) => {
          const d = EARTH.radius * 0.95 + blastEase * reach * shard.speed;
          DUMMY.position.copy(shard.dir).multiplyScalar(d);
          DUMMY.quaternion.setFromAxisAngle(shard.axis, shard.tumble * blastEase + t * 0.22);
          DUMMY.scale.setScalar(shard.scale * Math.max(0.001, 1 - boom * shrink) * fade);
          DUMMY.updateMatrix();
          mesh.setMatrixAt(i, DUMMY.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      write(rocks.current, shards.rocks, 11, 0.35);
      write(embers.current, shards.embers, 16, 0.55);
      embers.current.material.opacity = (1 - boom * boom) * fade;
      rocks.current.material.emissiveIntensity = 0.4 * (1 - boom) * fade;
    }

    const afterglow = exploded ? Math.pow(1 - boom, 1.6) * 0.35 : 0;
    fire.current.intensity = (heatGlow * 0.18 + pop * 0.7 + afterglow) * 90 * fade;

    lava.current.visible = debrisAlive;
    if (debrisAlive) {
      const { dirs, speeds, positions } = burst;
      const fall = blastEase * blastEase * 1.4;
      for (let i = 0; i < speeds.length; i++) {
        const reach = EARTH.radius * 0.9 + blastEase * (4.5 + speeds[i] * 7);
        positions[i * 3] = dirs[i * 3] * reach;
        positions[i * 3 + 1] = dirs[i * 3 + 1] * reach - fall * (1 - Math.abs(dirs[i * 3 + 1]));
        positions[i * 3 + 2] = dirs[i * 3 + 2] * reach;
      }
      lava.current.geometry.attributes.position.needsUpdate = true;
      lava.current.material.opacity = flareIn * (1 - Math.pow(boom, 1.2)) * fade * 0.7;
    }
  });

  return (
    <group ref={group} position={EARTH.center}>
      <mesh ref={sphere}>
        <sphereGeometry args={[EARTH.radius, 48, 32]} />
        <meshBasicMaterial map={night} color={NIGHT_COLOR} fog={false} />

        <mesh ref={marker} position={francePoint}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={beacon}
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </mesh>

      <mesh ref={atmo}>
        <planeGeometry args={[EARTH.radius * 2.75, EARTH.radius * 2.75]} />
        <meshBasicMaterial
          map={atmosphere}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={heat} visible={false} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={magma}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={flare} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={blast}
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight ref={fire} color="#ff7a2e" intensity={0} distance={40} decay={2} />

      <instancedMesh ref={rocks} args={[undefined, undefined, counts.rocks]} visible={false} frustumCulled={false}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#2b1713" roughness={0.88} flatShading emissive="#ff4d14" fog={false} />
      </instancedMesh>

      <instancedMesh ref={embers} args={[undefined, undefined, counts.embers]} visible={false} frustumCulled={false}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial
          color={[2.4, 0.95, 0.32]}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      <points ref={lava} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[burst.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={spark}
          color={[2.2, 1.05, 0.48]}
          size={0.28}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
