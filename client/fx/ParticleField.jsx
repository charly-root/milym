import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../store.js";
import { smoothstep, lerp } from "../utils/math.js";
import { BRAND_DOT, loadWordmarkImage } from "../brand/wordmark.js";
import * as shapes from "./shapes.js";

/**
 * L'acteur principal de la nouvelle animation : une seule nappe de particules
 * qui traverse tout le récit en se métamorphosant. Poussière du bureau,
 * tourbillon de l'idée, grille de numérisation, halo de l'interface, plaques
 * éclatées, rubans de données, sphère neuronale, implosion du noyau, galaxie de
 * l'écosystème, et enfin le nom du studio en constellation.
 *
 * Le CPU ne fait presque rien : il téléverse deux formes (départ et arrivée)
 * quand on change de segment, et le shader interpole avec un décalage propre à
 * chaque particule pour que la nuée voyage en vagues plutôt qu'en bloc.
 */
const TIMELINE = [
  { p: 0.0, shape: "dust", size: 1.15, swirl: 0.35, alpha: 0.5, color: "#d9c8a6" },
  { p: 0.12, shape: "dust", size: 1.15, swirl: 0.35, alpha: 0.55, color: "#d9c8a6" },
  { p: 0.2, shape: "vortex", size: 1.1, swirl: 0.85, alpha: 0.7, color: "#c2a8e8" },
  { p: 0.29, shape: "grid", size: 1.0, swirl: 0.4, alpha: 0.95, color: "#a78bfa" },
  { p: 0.37, shape: "grid", size: 0.95, swirl: 0.35, alpha: 0.85, color: "#a78bfa" },
  { p: 0.45, shape: "halo", size: 1.0, swirl: 0.35, alpha: 0.55, color: "#c4b5fd" },
  { p: 0.52, shape: "halo", size: 1.0, swirl: 0.35, alpha: 0.55, color: "#c4b5fd" },
  { p: 0.6, shape: "layers", size: 0.95, swirl: 0.5, alpha: 0.8, color: "#8b5cf6" },
  // Les particules quittent les plaques en même temps qu'elles : elles se
  // changent en rubans de données pendant que la pile s'enfonce dans le noir.
  { p: 0.648, shape: "layers", size: 0.95, swirl: 0.35, alpha: 0.45, color: "#8b5cf6" },
  { p: 0.7, shape: "streams", size: 0.9, swirl: 0.25, alpha: 0.35, color: "#c4b5fd" },
  { p: 0.745, shape: "streams", size: 0.9, swirl: 0.2, alpha: 0.22, color: "#c4b5fd" },
  { p: 0.785, shape: "neural", size: 0.85, swirl: 0.16, alpha: 0.26, color: "#ede9fe" },
  { p: 0.815, shape: "neural", size: 0.7, swirl: 0.4, alpha: 0.32, color: "#ddd6fe" },
  { p: 0.845, shape: "neural", size: 0.32, swirl: 0.75, alpha: 0.4, color: "#c4b5fd" },
  { p: 0.88, shape: "core", size: 1.0, swirl: 0.45, alpha: 0.85, color: "#c084fc" },
  { p: 0.905, shape: "core", size: 1.1, swirl: 0.5, alpha: 1.0, color: "#c084fc" },
  { p: 0.945, shape: "galaxy", size: 1.35, swirl: 0.4, alpha: 1.0, color: "#b39dfb" },
  { p: 0.962, shape: "galaxy", size: 1.3, swirl: 0.35, alpha: 0.95, color: "#bda9f7" },
  { p: 0.988, shape: "logo", size: 1.45, swirl: 0.3, alpha: 1.0, color: "#f3efff" },
  { p: 1.0, shape: "logo", size: 1.45, swirl: 0.25, alpha: 1.0, color: "#f3efff" }
];

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec4 aSeed;
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
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Chaque particule part avec un léger retard : la nuée voyage en vagues.
    float d = clamp(uMix * 1.35 - aSeed.w * 0.35, 0.0, 1.0);
    d = d * d * (3.0 - 2.0 * d);
    vec3 p = mix(aStart, aEnd, d);
    float mark = mix(aStartMark, aEndMark, d);

    float transit = d * (1.0 - d) * 4.0;
    float t = uTime * (0.25 + aSeed.w * 0.45);
    vec3 wob = vec3(
      sin(t * 1.7 + aSeed.x * 6.2832),
      cos(t * 1.3 + aSeed.y * 6.2832),
      sin(t * 2.3 + aSeed.z * 6.2832)
    );
    p += wob * (0.016 + uSwirl * transit * (0.14 + aSeed.w * 0.3));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Répulsion du curseur, en espace écran : les particules proches de la
    // souris s'écartent et s'accumulent au bord de la zone — un halo.
    vec2 ndc = gl_Position.xy / max(0.0001, gl_Position.w);
    vec2 away = ndc - uPointer;
    away.x *= uAspect;
    float dist = length(away);
    float push = smoothstep(0.34, 0.06, dist) * uRepel;
    vec2 dir = dist > 0.0001 ? away / dist : vec2(0.0, 1.0);
    dir.x /= uAspect;
    // Chaque particule réagit un peu différemment : le bord du halo respire.
    gl_Position.xy += dir * push * (0.16 + aSeed.w * 0.1) * gl_Position.w;

    float twinkle = 0.72 + 0.28 * sin(uTime * (1.5 + aSeed.w * 2.0) + aSeed.x * 40.0);
    vAlpha = uAlpha * twinkle;
    // En transit ou repoussée par le curseur, la particule brille plus fort.
    vec3 base = mix(uColor, uDotColor, mark);
    vColor = base * (0.75 + aSeed.w * 0.7) * (1.0 + transit * 1.1 + push * 2.2);
    gl_PointSize = uSize * (0.5 + aSeed.w * 1.1) * (1.0 + transit * 1.1) * uPixelRatio * (2.4 / max(0.4, -mv.z));
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.06, d) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function ParticleField({ quality }) {
  const points = useRef();
  const segment = useRef(-1);
  const count = quality.particleCount;

  const { geometry, material, forms, marks } = useMemo(() => {
    const forms = {};
    const marks = {};
    const emptyMarks = new Float32Array(count);
    for (const node of TIMELINE) {
      if (forms[node.shape]) continue;
      const generated = shapes[node.shape](count);
      if (generated && generated.positions) {
        forms[node.shape] = generated.positions;
        marks[node.shape] = generated.marks;
      } else {
        forms[node.shape] = generated;
        marks[node.shape] = emptyMarks;
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
        uRepel: { value: 0 }
      }
    });

    return { geometry, material, forms, marks };
  }, [count]);

  useEffect(() => {
    let cancelled = false;
    loadWordmarkImage()
      .then((image) => {
        if (cancelled) return;
        const shape = shapes.logo(count, image);
        forms.logo = shape.positions;
        marks.logo = shape.marks;
        const i = segment.current;
        if (i < 0) return;
        const a = TIMELINE[i];
        const b = TIMELINE[i + 1];
        if (a.shape !== "logo" && b.shape !== "logo") return;
        geometry.attributes.aStart.array.set(forms[a.shape]);
        geometry.attributes.aEnd.array.set(forms[b.shape]);
        geometry.attributes.aStartMark.array.set(marks[a.shape]);
        geometry.attributes.aEndMark.array.set(marks[b.shape]);
        geometry.attributes.aStart.needsUpdate = true;
        geometry.attributes.aEnd.needsUpdate = true;
        geometry.attributes.aStartMark.needsUpdate = true;
        geometry.attributes.aEndMark.needsUpdate = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [count, forms, marks, geometry]);

  const colorA = useMemo(() => new THREE.Color(), []);
  const colorB = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock, gl, size }, delta) => {
    const p = experienceStore.progress;
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
    const repelTarget = experienceStore.pointerActive ? 1 : 0;
    u.uRepel.value += (repelTarget - u.uRepel.value) * ease;

    let i = 0;
    while (i < TIMELINE.length - 2 && p >= TIMELINE[i + 1].p) i++;
    const a = TIMELINE[i];
    const b = TIMELINE[i + 1];

    if (segment.current !== i) {
      segment.current = i;
      geometry.attributes.aStart.array.set(forms[a.shape]);
      geometry.attributes.aEnd.array.set(forms[b.shape]);
      geometry.attributes.aStartMark.array.set(marks[a.shape]);
      geometry.attributes.aEndMark.array.set(marks[b.shape]);
      geometry.attributes.aStart.needsUpdate = true;
      geometry.attributes.aEnd.needsUpdate = true;
      geometry.attributes.aStartMark.needsUpdate = true;
      geometry.attributes.aEndMark.needsUpdate = true;
    }

    const t = smoothstep(a.p, b.p, p);
    u.uMix.value = t;
    u.uSwirl.value = lerp(a.swirl, b.swirl, t);
    u.uAlpha.value = lerp(a.alpha, b.alpha, t);
    u.uSize.value = lerp(a.size, b.size, t) * (quality.particleSize || 3.1);
    u.uColor.value.copy(colorA.set(a.color)).lerp(colorB.set(b.color), t);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
