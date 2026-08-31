import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Scene } from "./components/3d/Scene.jsx";
import { getDpr } from "./utils/quality.js";

export function ExperienceCanvas({ quality, tier, frameloop }) {
  return (
    <Canvas
      frameloop={frameloop}
      dpr={getDpr(tier)}
      gl={{
        antialias: quality.antialias,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      camera={{ fov: 30, near: 0.1, far: 110, position: [2.6, 3.8, 48] }}
      shadows={quality.shadows}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor("#050507", 1);
      }}
    >
      {tier !== "mobile" && <AdaptiveDpr />}
      <Suspense fallback={null}>
        <Scene quality={quality} />
      </Suspense>
    </Canvas>
  );
}
