import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../../store.js";
import { STAGE } from "../../stage.js";
import { lerp } from "../../utils/math.js";
import { drawWordmark } from "../../brand/wordmark.js";

const DUMMY = new THREE.Object3D();
const MID = new THREE.Vector3();
const DIR = new THREE.Vector3();
const MAX_HOLES = 28;
const TARGET_SIZE = 1.55;

function createTargetTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c0b12";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const rings = [
    [0.98, "#f4f0e6"],
    [0.82, "#c45c48"],
    [0.66, "#f4f0e6"],
    [0.5, "#c45c48"],
    [0.34, "#f4f0e6"],
    [0.2, "#7c2d3a"]
  ];
  for (const [r, color] of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, (size / 2) * r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(12,11,18,0.35)";
  ctx.lineWidth = 3;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (size / 2) * (0.2 + i * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }

  drawWordmark(ctx, cx, cy + 28, { fontSize: 92, color: "#0c0b12", align: "center" });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createHoleTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, "rgba(8,6,8,1)");
  g.addColorStop(0.28, "rgba(28,18,14,0.95)");
  g.addColorStop(0.55, "rgba(70,40,28,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(18,10,8,0.7)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 10, 64 + Math.sin(a) * 10);
    ctx.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFlashTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,250,220,1)");
  g.addColorStop(0.25, "rgba(255,180,70,0.9)");
  g.addColorStop(0.6, "rgba(255,80,20,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Easter egg : après cinq clics sur la constellation finale, un stand de tir
 * s'ouvre. Le pistolet est une silhouette de cinéma, les impacts s'impriment
 * sur une cible au logo du site.
 */
export function TargetRange() {
  const root = useRef();
  const target = useRef();
  const holes = useRef();
  const tracer = useRef();
  const bullet = useRef();
  const gun = useRef();
  const flash = useRef();
  const light = useRef();

  const maps = useMemo(
    () => ({
      target: createTargetTexture(),
      hole: createHoleTexture(),
      flash: createFlashTexture()
    }),
    []
  );

  const holeList = useRef([]);
  const lastShot = useRef(0);
  const tracerT = useRef(1);
  const from = useRef(new THREE.Vector3());
  const to = useRef(new THREE.Vector3());
  const appear = useRef(0);

  useFrame(({ camera, clock }, delta) => {
    const on = experienceStore.rangeMode;
    appear.current = lerp(appear.current, on ? 1 : 0, 1 - Math.pow(0.02, Math.min(delta, 0.05)));
    if (!root.current) return;

    root.current.visible = appear.current > 0.02;
    if (!root.current.visible) return;

    const s = appear.current;
    target.current.scale.setScalar(0.72 + s * 0.28);
    target.current.material.opacity = s;

    if (on && experienceStore.pendingShot && experienceStore.pendingShot.id !== lastShot.current) {
      const shot = experienceStore.pendingShot;
      lastShot.current = shot.id;
      const x = THREE.MathUtils.clamp(shot.x * 0.58, -0.7, 0.7);
      const y = THREE.MathUtils.clamp(shot.y * 0.58, -0.7, 0.7);
      holeList.current.push({ x, y, born: clock.elapsedTime });
      if (holeList.current.length > MAX_HOLES) holeList.current.shift();
      from.current.set(0.18, -0.22, -0.42).applyMatrix4(camera.matrixWorld);
      to.current.set(
        STAGE.center[0] + x,
        STAGE.center[1] + 0.22 + y,
        STAGE.center[2] + 0.42
      );
      tracerT.current = 0;
      if (flash.current) flash.current.material.opacity = 1;
    }

    if (holes.current) {
      const list = holeList.current;
      for (let i = 0; i < MAX_HOLES; i++) {
        if (i < list.length) {
          DUMMY.position.set(list[i].x, list[i].y, 0.02);
          DUMMY.scale.setScalar(0.16);
          DUMMY.rotation.set(0, 0, list[i].x * 4 + list[i].y);
        } else {
          DUMMY.position.set(0, 0, -2);
          DUMMY.scale.setScalar(0.0001);
        }
        DUMMY.updateMatrix();
        holes.current.setMatrixAt(i, DUMMY.matrix);
      }
      holes.current.instanceMatrix.needsUpdate = true;
    }

    tracerT.current = Math.min(1, tracerT.current + delta * 9);
    const flying = tracerT.current < 1 && on;
    if (tracer.current) {
      tracer.current.visible = flying;
      if (flying) {
        const a = from.current;
        const b = to.current;
        MID.copy(a).lerp(b, 0.5);
        tracer.current.position.copy(MID);
        DIR.copy(b).sub(a);
        const len = DIR.length();
        tracer.current.scale.set(0.012, 0.012, Math.max(0.02, len * (1 - tracerT.current * 0.35)));
        tracer.current.lookAt(b);
        tracer.current.material.opacity = 0.85 * (1 - tracerT.current);
        bullet.current.position.copy(a).lerp(b, Math.min(1, tracerT.current * 1.15));
        bullet.current.visible = true;
      } else if (bullet.current) {
        bullet.current.visible = false;
      }
    }

    if (flash.current) {
      flash.current.material.opacity = Math.max(0, flash.current.material.opacity - delta * 8);
      flash.current.visible = flash.current.material.opacity > 0.02;
      const pulse = 1 + Math.sin(clock.elapsedTime * 40) * 0.12;
      flash.current.scale.setScalar(0.22 * pulse * (0.4 + flash.current.material.opacity));
    }

    if (gun.current) {
      gun.current.visible = on;
      const kick = flash.current && flash.current.material.opacity > 0.2 ? 0.045 : 0;
      gun.current.position.copy(camera.position);
      gun.current.quaternion.copy(camera.quaternion);
      gun.current.translateX(0.28);
      gun.current.translateY(-0.28);
      gun.current.translateZ(-0.55 + kick);
      gun.current.rotateX(0.12);
      gun.current.rotateY(0.18);
    }

    if (light.current) light.current.intensity = s * 1.4;
  });

  return (
    <group ref={root} visible={false}>
      <group position={[STAGE.center[0], STAGE.center[1] + 0.22, STAGE.center[2] + 0.42]}>
        <mesh ref={target}>
          <circleGeometry args={[TARGET_SIZE / 2, 64]} />
          <meshBasicMaterial map={maps.target} transparent opacity={0} />
        </mesh>
        <instancedMesh ref={holes} args={[undefined, undefined, MAX_HOLES]} frustumCulled={false}>
          <circleGeometry args={[0.5, 16]} />
          <meshBasicMaterial map={maps.hole} transparent depthWrite={false} />
        </instancedMesh>
      </group>

      <mesh position={[STAGE.center[0], STAGE.center[1] - 0.62, STAGE.center[2] + 0.42]}>
        <cylinderGeometry args={[0.035, 0.045, 1.1, 8]} />
        <meshStandardMaterial color="#1a1520" roughness={0.7} metalness={0.25} />
      </mesh>

      <mesh ref={tracer} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={[4, 2.2, 0.7]} transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh ref={bullet} visible={false}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={[5, 3.2, 1.1]} toneMapped={false} />
      </mesh>

      <group ref={gun} visible={false}>
        <mesh position={[0, 0.02, -0.12]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.07, 0.09, 0.28]} />
          <meshStandardMaterial color="#1a1a1e" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.035, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.02, 0.34, 10]} />
          <meshStandardMaterial color="#2a2a32" roughness={0.35} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.08, -0.04]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.055, 0.16, 0.08]} />
          <meshStandardMaterial color="#141418" roughness={0.6} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.08, -0.02]}>
          <boxGeometry args={[0.02, 0.04, 0.04]} />
          <meshStandardMaterial color="#3a3a44" roughness={0.4} metalness={0.6} />
        </mesh>
        <sprite ref={flash} position={[0, 0.04, -0.58]} scale={[0.22, 0.22, 1]} visible={false}>
          <spriteMaterial
            map={maps.flash}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0}
          />
        </sprite>
      </group>

      <spotLight
        ref={light}
        position={[STAGE.center[0], STAGE.center[1] + 1.8, STAGE.center[2] + 1.6]}
        angle={0.4}
        penumbra={0.6}
        intensity={0}
        color="#fff4e0"
      />
    </group>
  );
}
