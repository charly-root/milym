import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { EARTH, PROLOGUE } from "../stage.js";
import { smoothstep } from "../utils/math.js";

/**
 * Le prologue : la Terre de nuit qui tourne sur elle-même, puis se fige avec
 * la France face caméra pendant que celle-ci plonge vers elle. Un point de
 * lumière pulse sur la France pour guider l'œil pendant l'approche.
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

export function Earth() {
  const group = useRef();
  const sphere = useRef();
  const marker = useRef();
  const atmo = useRef();
  const night = useLoader(THREE.TextureLoader, "/textures/earth-night.jpg");
  night.colorSpace = THREE.SRGBColorSpace;
  night.anisotropy = 4;

  const atmosphere = useMemo(createRimTexture, []);
  const beacon = useMemo(() => createGlowTexture("rgba(255,250,255,1)", "rgba(196,166,255,0.5)"), []);

  const francePoint = useMemo(
    () => new THREE.Vector3(...EARTH.france).multiplyScalar(EARTH.radius * 1.01),
    []
  );

  useFrame(({ clock, camera }) => {
    const raw = experienceStore.rawProgress;
    if (!group.current) return;

    group.current.visible = raw < PROLOGUE + 0.03;
    if (!group.current.visible) return;

    // Rotation libre au repos, qui s'amortit vers la France face caméra quand
    // l'approche commence. L'angle est replié pour éviter tout tour complet.
    const settle = smoothstep(0.02, 0.055, raw);
    const spin = (clock.elapsedTime * 0.045) % (Math.PI * 2);
    const folded = Math.atan2(Math.sin(spin), Math.cos(spin));
    sphere.current.rotation.y = folded * (1 - settle);

    // Le repère France : invisible tant que la Terre tourne, il pulse pendant
    // la plongée puis s'efface quand la surface remplit l'écran.
    const focus = smoothstep(0.045, 0.07, raw) * (1 - smoothstep(0.088, 0.098, raw));
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.18;
    marker.current.material.opacity = focus * 0.9;
    marker.current.scale.setScalar(0.34 * pulse);
    marker.current.quaternion.copy(camera.quaternion);

    // Le halo fait toujours face à la caméra, même pendant la plongée oblique.
    atmo.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={group} position={EARTH.center}>
      <mesh ref={sphere}>
        <sphereGeometry args={[EARTH.radius, 48, 32]} />
        {/* Couleur > 1 : la texture de nuit est sombre, on la surexpose pour
            que les villes scintillent malgré le tone mapping. */}
        <meshBasicMaterial map={night} color={[1.8, 1.8, 2.2]} fog={false} />

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
    </group>
  );
}
