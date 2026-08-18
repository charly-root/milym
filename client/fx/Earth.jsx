import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { EARTH, BOOM } from "../stage.js";
import { smoothstep, lerp } from "../utils/math.js";

/**
 * Le prologue : la France de nuit, déjà face caméra, chauffe de l'intérieur…
 * puis détone. La sphère éclate en débris rocheux bordés de lave, une gerbe
 * de particules incandescentes jaillit, et l'éclair de la détonation couvre
 * le raccord vers le bureau.
 *
 * La texture (NASA Black Marble, auto-hébergée) est peu lourde : elle n'est
 * chargée qu'avec le reste de l'expérience, en lazy.
 */
function createGlowTexture(inner, mid) {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, mid);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Liseré atmosphérique : un anneau dont le pic tombe exactement sur la
 * silhouette de la sphère (le plan fait 1.375 rayon de demi-côté, la
 * silhouette est donc à 72,7 % du rayon du dégradé).
 */
function createRimTexture() {
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(0.72, "rgba(158,128,255,0.85)");
  gradient.addColorStop(0.85, "rgba(96,64,208,0.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Direction aléatoire uniforme sur la sphère. */
function randomDirection() {
  const u = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, u);
}

const DUMMY = new THREE.Object3D();
const NIGHT_COLOR = new THREE.Color(1.8, 1.8, 2.2);
const MAGMA_COLOR = new THREE.Color(2.8, 1.35, 0.75);

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
  night.anisotropy = 4;

  const atmosphere = useMemo(createRimTexture, []);
  const beacon = useMemo(() => createGlowTexture("rgba(255,250,255,1)", "rgba(196,166,255,0.5)"), []);
  const magma = useMemo(() => createGlowTexture("rgba(255,214,150,1)", "rgba(255,96,28,0.55)"), []);
  const blast = useMemo(() => createGlowTexture("rgba(255,247,230,1)", "rgba(255,132,44,0.7)"), []);
  const spark = useMemo(() => createGlowTexture("rgba(255,236,200,1)", "rgba(255,110,40,0.8)"), []);

  const mobile = experienceStore.tier === "mobile";
  const counts = useMemo(
    () => ({ rocks: mobile ? 46 : 90, embers: mobile ? 40 : 80, lava: mobile ? 320 : 680 }),
    [mobile]
  );

  // Chaque débris : direction d'éjection, vitesse, axe et vitesse de culbute,
  // taille. Généré une fois, rejoué de façon déterministe par le scroll.
  const shards = useMemo(() => {
    const make = (count, fast) =>
      Array.from({ length: count }, () => ({
        dir: randomDirection(),
        speed: (fast ? 1.15 : 0.7) + Math.random() * (fast ? 1.15 : 0.75),
        axis: randomDirection(),
        tumble: (Math.random() - 0.5) * 14,
        scale: (fast ? 0.28 : 0.55) + Math.random() * (fast ? 0.34 : 1.05)
      }));
    return { rocks: make(counts.rocks, false), embers: make(counts.embers, true) };
  }, [counts]);

  // La gerbe de lave : directions et vitesses figées, positions récrites
  // chaque frame (quelques centaines de points, négligeable côté CPU).
  const burst = useMemo(() => {
    const dirs = new Float32Array(counts.lava * 3);
    const speeds = new Float32Array(counts.lava);
    const positions = new Float32Array(counts.lava * 3);
    for (let i = 0; i < counts.lava; i++) {
      const d = randomDirection();
      dirs.set([d.x, d.y, d.z], i * 3);
      speeds[i] = 0.5 + Math.pow(Math.random(), 1.6) * 2.3;
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

    group.current.visible = raw < BOOM.end + 0.02;
    if (!group.current.visible) return;

    const t = clock.elapsedTime;
    // La chauffe avant la détonation, puis l'explosion elle-même : `boom`
    // progresse linéairement, `blastEase` part très vite et décélère, comme
    // une vraie onde de souffle.
    const heatAmount = smoothstep(BOOM.heatStart, BOOM.start, raw);
    const boom = smoothstep(BOOM.start, BOOM.end, raw);
    const blastEase = 1 - Math.pow(1 - boom, 3);
    const exploded = raw >= BOOM.start;

    // ---- La Terre intacte : rotation, tremblement, chauffe des villes ----
    sphere.current.visible = !exploded;
    atmo.current.visible = !exploded;
    if (!exploded) {
      // Pas de rotation : la France reste face caméra dès le plan d'ouverture.
      sphere.current.rotation.y = 0;

      // Le sol tremble de plus en plus fort à mesure que le magma monte.
      const tremor = 1 + heatAmount * Math.sin(t * 26) * 0.012;
      sphere.current.scale.setScalar(tremor);
      // Les lumières des villes virent à l'orange magma.
      sphere.current.material.color.copy(NIGHT_COLOR).lerp(MAGMA_COLOR, heatAmount);

      // Le repère France : visible dès l'ouverture, il pulse puis cède la
      // place à la chauffe (au moment où toute la planète devient le sujet).
      const focus = 1 - smoothstep(BOOM.heatStart + 0.004, BOOM.start - 0.004, raw);
      const pulse = 1 + Math.sin(t * 4) * 0.18;
      marker.current.material.opacity = focus * 0.85;
      marker.current.scale.setScalar(0.42 * pulse);
      marker.current.quaternion.copy(camera.quaternion);

      atmo.current.material.opacity = 1 - heatAmount * 0.35;
      atmo.current.quaternion.copy(camera.quaternion);
    }

    // ---- La lueur de magma qui enfle sous la croûte ----
    const heatGlow = heatAmount * (1 - smoothstep(BOOM.start, BOOM.start + 0.006, raw));
    heat.current.visible = heatGlow > 0.004;
    if (heat.current.visible) {
      const throb = 1 + Math.sin(t * 9) * 0.06 * heatAmount;
      heat.current.material.opacity = heatGlow * 0.55;
      heat.current.scale.setScalar(EARTH.radius * (1.7 + heatAmount * 0.7) * throb);
      heat.current.quaternion.copy(camera.quaternion);
    }

    // ---- L'éclair de la détonation : un pop bref, puis l'espace redevient
    // noir pour laisser voir le champ de débris — la boule de feu résiduelle
    // continue de rougeoyer au centre. ----
    const flareIn = smoothstep(BOOM.start, BOOM.start + 0.004, raw);
    const pop = flareIn * (1 - smoothstep(BOOM.start + 0.004, BOOM.start + 0.014, raw));
    const coreGlow = flareIn * 0.55 * (1 - boom);
    const flareAmount = pop + coreGlow;
    flare.current.visible = flareAmount > 0.004;
    if (flare.current.visible) {
      flare.current.material.opacity = flareAmount;
      flare.current.scale.setScalar(EARTH.radius * (0.9 + blastEase * 5));
      flare.current.quaternion.copy(camera.quaternion);
    }

    // ---- Les débris : la croûte éclatée, culbutant vers l'extérieur ----
    const debrisAlive = exploded && boom < 1;
    rocks.current.visible = debrisAlive;
    embers.current.visible = debrisAlive;
    if (debrisAlive) {
      const write = (mesh, list, reach, shrink) => {
        list.forEach((shard, i) => {
          const d = EARTH.radius * 0.7 + blastEase * reach * shard.speed;
          DUMMY.position.copy(shard.dir).multiplyScalar(d);
          DUMMY.quaternion.setFromAxisAngle(shard.axis, shard.tumble * blastEase + t * 0.35);
          DUMMY.scale.setScalar(shard.scale * Math.max(0.001, 1 - boom * shrink));
          DUMMY.updateMatrix();
          mesh.setMatrixAt(i, DUMMY.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      write(rocks.current, shards.rocks, 19, 0.55);
      write(embers.current, shards.embers, 27, 0.8);
      embers.current.material.opacity = 1 - boom * boom;
      // Les arêtes rougeoient à la détonation puis refroidissent.
      rocks.current.material.emissiveIntensity = 0.65 * (1 - boom);
    }

    // Le feu central éclaire les débris : il culmine à la détonation puis
    // meurt lentement — les rochers restent lisibles tout le long du vol.
    const afterglow = exploded ? Math.pow(1 - boom, 1.5) * 0.55 : 0;
    fire.current.intensity = (heatGlow * 0.4 + pop + afterglow) * 420;

    // ---- La gerbe de lave ----
    lava.current.visible = debrisAlive;
    if (debrisAlive) {
      const { dirs, speeds, positions } = burst;
      const fall = blastEase * blastEase * 2.6;
      for (let i = 0; i < speeds.length; i++) {
        const reach = EARTH.radius * 0.65 + blastEase * (8 + speeds[i] * 13);
        positions[i * 3] = dirs[i * 3] * reach;
        positions[i * 3 + 1] = dirs[i * 3 + 1] * reach - fall * (1 - Math.abs(dirs[i * 3 + 1]));
        positions[i * 3 + 2] = dirs[i * 3 + 2] * reach;
      }
      lava.current.geometry.attributes.position.needsUpdate = true;
      lava.current.material.opacity = flareIn * (1 - Math.pow(boom, 1.4));
    }
  });

  return (
    <group ref={group} position={EARTH.center}>
      <mesh ref={sphere}>
        <sphereGeometry args={[EARTH.radius, 48, 32]} />
        {/* Couleur > 1 : la texture de nuit est sombre, on la surexpose pour
            que les villes scintillent malgré le tone mapping. */}
        <meshBasicMaterial map={night} color={NIGHT_COLOR} fog={false} />

        {/* Enfant de la sphère : le repère suit la rotation, donc la France. */}
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

      {/* Halo atmosphérique : un anneau additif calé sur la silhouette. */}
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

      {/* La chauffe : un halo magma qui enfle par-dessus la croûte avant
          l'éclat. Sans depthTest : la sphère est devant lui, il doit quand
          même embraser l'image. */}
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

      {/* L'éclair de la détonation, plein cadre. */}
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

      {/* Le feu au cœur de l'explosion : il sculpte les facettes des rochers. */}
      <pointLight ref={fire} color="#ff7a2e" intensity={0} distance={60} decay={2} />

      {/* La croûte éclatée : rochers facettés, éclairés par le feu central,
          dont les arêtes rougeoient puis refroidissent. */}
      <instancedMesh ref={rocks} args={[undefined, undefined, counts.rocks]} visible={false} frustumCulled={false}>
        <icosahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#2b1713" roughness={0.85} flatShading emissive="#ff4d14" fog={false} />
      </instancedMesh>

      {/* …et des blocs incandescents, plus rapides, qui filent devant. */}
      <instancedMesh ref={embers} args={[undefined, undefined, counts.embers]} visible={false} frustumCulled={false}>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshBasicMaterial
          color={[3.2, 1.1, 0.35]}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* La gerbe de lave : des centaines d'étincelles en expansion radiale. */}
      <points ref={lava} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[burst.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={spark}
          color={[2.6, 1.15, 0.5]}
          size={0.42}
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
