import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { smoothstep, lerp } from "../utils/math.js";
import { BRAND_DOT, loadWordmarkImage } from "../brand/wordmark.js";
import { PROLOGUE } from "../stage.js";
import * as shapes from "./shapes.js";

/**
 * L'acteur principal de la nouvelle animation : une seule nappe de particules
 * qui traverse tout le récit en se métamorphosant. Poussière du bureau,
 * tourbillon de l'idée, grille de numérisation, halo de l'interface, plaques
 * éclatées, rubans de données, sphère neuronale, implosion du noyau, galaxie de
 * l'écosystème, puis MILYM écrit lettre par lettre — rien d'autre.
 *
 * Le CPU ne fait presque rien : il téléverse deux formes (départ et arrivée)
 * quand on change de segment, et le shader interpole avec un décalage propre à
 * chaque particule pour que la nuée voyage en vagues plutôt qu'en bloc.
 */
const TIMELINE = [
  { p: 0.0, shape: "dust", size: 1.05, swirl: 0.28, alpha: 0.32, color: "#d9c8a6" },
  { p: 0.12, shape: "dust", size: 1.05, swirl: 0.28, alpha: 0.38, color: "#d9c8a6" },
  { p: 0.2, shape: "vortex", size: 1.05, swirl: 0.55, alpha: 0.52, color: "#c2a8e8" },
  { p: 0.29, shape: "grid", size: 0.9, swirl: 0.28, alpha: 0.62, color: "#a78bfa" },
  { p: 0.37, shape: "grid", size: 0.85, swirl: 0.22, alpha: 0.5, color: "#a78bfa" },
  { p: 0.45, shape: "halo", size: 1.0, swirl: 0.28, alpha: 0.42, color: "#c4b5fd" },
  { p: 0.52, shape: "halo", size: 1.05, swirl: 0.3, alpha: 0.45, color: "#c4b5fd" },
  { p: 0.58, shape: "layers", size: 1.1, swirl: 0.35, alpha: 0.58, color: "#a78bfa" },
  { p: 0.63, shape: "layers", size: 1.0, swirl: 0.28, alpha: 0.5, color: "#8b5cf6" },
  { p: 0.67, shape: "servers", size: 1.1, swirl: 0.3, alpha: 0.58, color: "#86efac" },
  { p: 0.705, shape: "servers", size: 1.0, swirl: 0.24, alpha: 0.48, color: "#4ade80" },
  { p: 0.735, shape: "database", size: 1.15, swirl: 0.28, alpha: 0.58, color: "#fb7185" },
  { p: 0.77, shape: "database", size: 1.0, swirl: 0.22, alpha: 0.42, color: "#f9a8d4" },
  { p: 0.8, shape: "neural", size: 0.9, swirl: 0.18, alpha: 0.45, color: "#ede9fe" },
  { p: 0.82, shape: "neural", size: 0.78, swirl: 0.28, alpha: 0.32, color: "#ddd6fe" },
  { p: 0.855, shape: "core", size: 0.95, swirl: 0.28, alpha: 0.55, color: "#c084fc" },
  { p: 0.893, shape: "core", size: 1.15, swirl: 0.22, alpha: 0.78, color: "#e9d5ff" },
  { p: 0.91, shape: "core", size: 1.12, swirl: 0.2, alpha: 0.72, color: "#ddd6fe" },
  { p: 0.938, shape: "galaxy", size: 1.18, swirl: 0.22, alpha: 0.68, color: "#b39dfb" },
  { p: 0.948, shape: "galaxy", size: 1.2, swirl: 0.18, alpha: 0.72, color: "#c4b5fd" },
  { p: 1.0, shape: "logo", size: 1.08, swirl: 0.02, alpha: 0.92, color: "#f7f5ff", write: true }
];

/** La galaxie se verse dans M, I, L, Y, M, puis le carré. */
const WRITE_START = 0.948;
const WRITE_END = 0.982;

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec4 aSeed;
  attribute float aGlyph;
  attribute float aLayer;
  uniform float uMix;
  uniform float uTime;
  uniform float uSize;
  uniform float uSwirl;
  uniform float uAlpha;
  uniform float uPixelRatio;
  attribute float aStartMark;
  attribute float aEndMark;
  uniform vec3 uColor;
  uniform vec3 uDotColor;
  uniform vec2 uPointer;
  uniform float uAspect;
  uniform float uRepel;
  uniform float uSpreadY;
  uniform float uStagger;
  uniform float uWrite;
  uniform float uGlyphs;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vWrite;
  varying float vLayer;

  void main() {
    float d;
    vec3 p;
    float mark;
    float writeAlpha = 1.0;
    float transit = 0.0;

    if (uWrite > 0.5) {
      if (aGlyph < 0.0) {
        gl_PointSize = 0.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vAlpha = 0.0;
        vColor = vec3(0.0);
        vWrite = 1.0;
        vLayer = 0.0;
        return;
      }
      float n = max(1.0, uGlyphs);
      float t0 = aGlyph / n;
      float t1 = (aGlyph + 0.7) / n;
      d = clamp((uMix - t0) / max(0.0001, t1 - t0), 0.0, 1.0);
      d = d * d * (3.0 - 2.0 * d);
      p = mix(aStart, aEnd, d);
      mark = mix(aStartMark, aEndMark, d);
      transit = d * (1.0 - d) * 4.0;
      float t = uTime * (0.25 + aSeed.w * 0.45);
      vec3 wob = vec3(
        sin(t * 1.7 + aSeed.x * 6.2832),
        cos(t * 1.3 + aSeed.y * 6.2832),
        sin(t * 2.3 + aSeed.z * 6.2832)
      );
      p += wob * mix(0.032 + uSwirl * 0.1, 0.0014 + aLayer * 0.0022, d);
      p += wob * transit * (0.1 + aSeed.w * 0.16);
      writeAlpha = 1.0;
    } else {
      float span = 1.0 + uStagger;
      d = clamp(uMix * span - aSeed.w * uStagger, 0.0, 1.0);
      d = d * d * (3.0 - 2.0 * d);
      p = mix(aStart, aEnd, d);
      mark = mix(aStartMark, aEndMark, d);
      p.y = 1.15 + (p.y - 1.15) * uSpreadY;
      transit = d * (1.0 - d) * 4.0;
      float t = uTime * (0.25 + aSeed.w * 0.45);
      vec3 wob = vec3(
        sin(t * 1.7 + aSeed.x * 6.2832),
        cos(t * 1.3 + aSeed.y * 6.2832),
        sin(t * 2.3 + aSeed.z * 6.2832)
      );
      p += wob * (0.016 + uSwirl * transit * (0.14 + aSeed.w * 0.3));
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float push = 0.0;
    if (uWrite < 0.5) {
      vec2 ndc = gl_Position.xy / max(0.0001, gl_Position.w);
      vec2 away = ndc - uPointer;
      away.x *= uAspect;
      float dist = length(away);
      push = smoothstep(0.34, 0.06, dist) * uRepel;
      vec2 dir = dist > 0.0001 ? away / dist : vec2(0.0, 1.0);
      dir.x /= uAspect;
      gl_Position.xy += dir * push * (0.16 + aSeed.w * 0.1) * gl_Position.w;
    }

    vec3 base = mix(uColor, uDotColor, mark);
    float atten = 2.15 / max(0.75, -mv.z);
    vWrite = uWrite;
    vLayer = aLayer;
    if (uWrite > 0.5) {
      float spark = 0.91 + 0.09 * sin(uTime * (0.85 + aSeed.w * 1.05) + aSeed.x * 16.0);
      float layerAmt = clamp(aLayer * 0.5, 0.0, 1.0);
      vAlpha = uAlpha * mix(0.58 + transit * 0.35, mix(0.95, 0.28, layerAmt), d) * spark;
      vec3 letter = vec3(0.97, 0.96, 1.0) * (0.84 + aSeed.w * 0.24);
      vec3 square = uDotColor * (1.65 + aSeed.w * 0.3);
      vColor = mix(letter, square, mark) * (1.0 + transit * 0.65);
      vColor *= mix(1.0, mix(1.0, 0.4, layerAmt), d);
      float sizeMul = mix(0.78, mix(0.48, 1.08, layerAmt), d);
      if (mark > 0.5) sizeMul *= mix(1.0, 1.18, d);
      gl_PointSize = min(13.0, uSize * sizeMul * (0.72 + aSeed.w * 0.22) * uPixelRatio * atten);
    } else {
      float twinkle = 0.72 + 0.28 * sin(uTime * (1.5 + aSeed.w * 2.0) + aSeed.x * 40.0);
      vAlpha = uAlpha * twinkle * (0.9 + transit * 0.35);
      vColor = base * (0.85 + aSeed.w * 0.75) * (1.0 + transit * 1.25 + push * 2.2);
      gl_PointSize = min(20.0, uSize * (0.5 + aSeed.w * 1.05) * (1.0 + transit * 0.85) * uPixelRatio * atten);
    }
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  varying float vWrite;
  varying float vLayer;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a;
    if (vWrite > 0.5) {
      float layerAmt = clamp(vLayer * 0.5, 0.0, 1.0);
      float core = smoothstep(0.15 + layerAmt * 0.08, 0.0, d);
      float glow = smoothstep(0.46, 0.1 + layerAmt * 0.1, d);
      a = (core * mix(0.95, 0.18, layerAmt) + glow * mix(0.2, 0.42, layerAmt)) * vAlpha;
    } else {
      a = smoothstep(0.5, 0.06, d) * vAlpha;
    }
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function ParticleField({ quality }) {
  const points = useRef();
  const segment = useRef(-1);
  const count = quality.particleCount;

  const { geometry, material, forms, marks, glyphs, layers } = useMemo(() => {
    const forms = {};
    const marks = {};
    const glyphs = {};
    const layers = {};
    const emptyMarks = new Float32Array(count);
    const emptyGlyphs = new Float32Array(count);
    const emptyLayers = new Float32Array(count);
    emptyGlyphs.fill(-1);
    for (const node of TIMELINE) {
      if (forms[node.shape]) continue;
      const generated = shapes[node.shape](count);
      if (generated && generated.positions) {
        forms[node.shape] = generated.positions;
        marks[node.shape] = generated.marks;
        glyphs[node.shape] = generated.glyphs ?? emptyGlyphs;
        layers[node.shape] = generated.layers ?? emptyLayers;
      } else {
        forms[node.shape] = generated;
        marks[node.shape] = emptyMarks;
        glyphs[node.shape] = emptyGlyphs;
        layers[node.shape] = emptyLayers;
      }
    }

    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();

    const geometry = new THREE.BufferGeometry();
    // `position` n'est là que pour le culling : les vrais points sont aStart/aEnd.
    geometry.setAttribute("position", new THREE.BufferAttribute(forms.dust.slice(), 3));
    geometry.setAttribute("aStart", new THREE.BufferAttribute(forms.dust.slice(), 3));
    geometry.setAttribute("aEnd", new THREE.BufferAttribute(forms.dust.slice(), 3));
    geometry.setAttribute("aStartMark", new THREE.BufferAttribute(emptyMarks.slice(), 1));
    geometry.setAttribute("aEndMark", new THREE.BufferAttribute(emptyMarks.slice(), 1));
    geometry.setAttribute("aGlyph", new THREE.BufferAttribute(emptyGlyphs.slice(), 1));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(emptyLayers.slice(), 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    // La nappe traverse toute la scène : on désactive le culling plutôt que de
    // recalculer une sphère englobante à chaque morph.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.15, -1), 30);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMix: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 3.1 },
        uSwirl: { value: 0.35 },
        uAlpha: { value: 0.4 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new THREE.Color("#d9c8a6") },
        uDotColor: { value: new THREE.Color(BRAND_DOT) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uAspect: { value: 1 },
        uRepel: { value: 0 },
        uSpreadY: { value: 1 },
        uStagger: { value: 0.35 },
        uWrite: { value: 0 },
        uGlyphs: { value: 6 }
      }
    });

    return { geometry, material, forms, marks, glyphs, layers };
  }, [count]);

  useEffect(() => {
    let cancelled = false;
    loadWordmarkImage()
      .then((image) => {
        if (cancelled) return;
        const shape = shapes.logo(count, image);
        forms.logo = shape.positions;
        marks.logo = shape.marks;
        glyphs.logo = shape.glyphs;
        layers.logo = shape.layers;
        const i = segment.current;
        if (i < 0) return;
        const a = TIMELINE[i];
        const b = TIMELINE[i + 1];
        if (a.shape !== "logo" && b.shape !== "logo") return;
        geometry.attributes.aStart.array.set(forms[a.shape]);
        geometry.attributes.aEnd.array.set(forms[b.shape]);
        geometry.attributes.aStartMark.array.set(marks[a.shape]);
        geometry.attributes.aEndMark.array.set(marks[b.shape]);
        geometry.attributes.aGlyph.array.set(glyphs[b.shape]);
        geometry.attributes.aLayer.array.set(layers[b.shape]);
        geometry.attributes.aStart.needsUpdate = true;
        geometry.attributes.aEnd.needsUpdate = true;
        geometry.attributes.aStartMark.needsUpdate = true;
        geometry.attributes.aEndMark.needsUpdate = true;
        geometry.attributes.aGlyph.needsUpdate = true;
        geometry.attributes.aLayer.needsUpdate = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [count, forms, marks, glyphs, layers, geometry]);

  const colorA = useMemo(() => new THREE.Color(), []);
  const colorB = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock, gl, size }, delta) => {
    const p = experienceStore.progress;
    const space = 1 - smoothstep(PROLOGUE - 0.008, PROLOGUE + 0.02, experienceStore.rawProgress);
    if (experienceStore.rangeMode || space > 0.97) {
      if (points.current) points.current.visible = false;
      return;
    }
    if (points.current) points.current.visible = true;
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uPixelRatio.value = gl.getPixelRatio();

    // Le halo suit la souris avec un léger retard, et ne s'active qu'au
    // premier mouvement — sinon il creuserait le centre de l'écran au chargement.
    const ease = 1 - Math.pow(0.0015, Math.min(delta, 0.05));
    const pointer = u.uPointer.value;
    pointer.x += (experienceStore.pointer.x - pointer.x) * ease;
    pointer.y += (experienceStore.pointer.y - pointer.y) * ease;
    u.uAspect.value = size.width / size.height;

    let i = 0;
    while (i < TIMELINE.length - 2 && p >= TIMELINE[i + 1].p) i++;
    const a = TIMELINE[i];
    const b = TIMELINE[i + 1];
    const writing = Boolean(a.write || b.write);

    if (segment.current !== i) {
      segment.current = i;
      geometry.attributes.aStart.array.set(forms[a.shape]);
      geometry.attributes.aEnd.array.set(forms[b.shape]);
      geometry.attributes.aStartMark.array.set(marks[a.shape]);
      geometry.attributes.aEndMark.array.set(marks[b.shape]);
      geometry.attributes.aGlyph.array.set(glyphs[b.shape]);
      geometry.attributes.aLayer.array.set(layers[b.shape]);
      geometry.attributes.aStart.needsUpdate = true;
      geometry.attributes.aEnd.needsUpdate = true;
      geometry.attributes.aStartMark.needsUpdate = true;
      geometry.attributes.aEndMark.needsUpdate = true;
      geometry.attributes.aGlyph.needsUpdate = true;
      geometry.attributes.aLayer.needsUpdate = true;
    }

    if (writing) {
      const t = Math.min(1, Math.max(0, (p - WRITE_START) / (WRITE_END - WRITE_START)));
      u.uWrite.value = 1;
      u.uMix.value = t;
      u.uGlyphs.value = 6;
      u.uSwirl.value = lerp(a.swirl ?? 0.18, b.swirl ?? 0.05, t);
      u.uRepel.value = 0;
      u.uSpreadY.value = 1;
      u.uStagger.value = 0;
      u.uAlpha.value = lerp(a.alpha, b.alpha, t) * (1 - space);
      u.uSize.value = lerp(a.size, b.size, t) * (quality.particleSize || 3.1);
      u.uColor.value.copy(colorA.set(a.color)).lerp(colorB.set(b.color), t);
    } else {
      const repelTarget = experienceStore.pointerActive ? 1 : 0;
      u.uRepel.value += (repelTarget - u.uRepel.value) * ease;
      const span = Math.max(1e-6, b.p - a.p);
      let t = Math.min(1, Math.max(0, (p - a.p) / span));
      t = t * t * (3 - 2 * t);
      u.uWrite.value = 0;
      u.uMix.value = t;
      u.uStagger.value = b.stagger ?? a.stagger ?? 0.35;
      u.uSwirl.value = lerp(a.swirl, b.swirl, t);
      u.uAlpha.value = lerp(a.alpha, b.alpha, t) * (1 - space);
      u.uSize.value = lerp(a.size, b.size, t) * (quality.particleSize || 3.1);
      u.uColor.value.copy(colorA.set(a.color)).lerp(colorB.set(b.color), t);
      u.uSpreadY.value = experienceStore.spreadY || 1;
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
