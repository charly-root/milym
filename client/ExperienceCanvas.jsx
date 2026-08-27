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
      camera={{ fov: 28, near: 0.1, far: 90, position: [2.4, 4.6, 46] }}
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
