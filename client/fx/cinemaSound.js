import { BOOM, METEOR } from "../stage.js";
import { experienceStore } from "../store.js";

/**
 * Habillage sonore de l'accueil : rumble spatial, météorite, explosion,
 * papier, scan, chimes. Tout est synthétisé (Web Audio), rien n'est chargé
 * depuis un fichier — pas de sample Hollywood copyrighté, le grain reste
 * celui d'une bande-son de film (sub, crack, whoosh, punch).
 */

let ctx;
let master;
let unlocked = false;
let lastRaw = -1;
let lastStory = -1;
const fired = new Set();
let drone;
let meteorGain;
let meteorOsc;
let rumbleGain;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.42;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 8;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.22;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  return ctx;
}

export function unlockCinemaAudio() {
  if (experienceStore.reducedMotion) return;
  const audio = ensure();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume();
  unlocked = true;
  startDrone();
}

function now() {
  return ctx ? ctx.currentTime : 0;
}

function envGain(duration, peak = 1, attack = 0.008, release = 0.4) {
  const g = ctx.createGain();
  const t = now();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.02, duration));
  g.connect(master);
  return g;
}

function noiseBuffer(seconds = 1.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noise(duration, { filterType = "lowpass", freq = 400, Q = 0.7, peak = 0.4, attack = 0.004 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(Math.min(2, duration + 0.2));
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = Q;
  const g = envGain(duration, peak, attack, duration);
  src.connect(filter);
  filter.connect(g);
  src.start();
  src.stop(now() + duration + 0.05);
}

function tone(freq, duration, { type = "sine", peak = 0.2, attack = 0.01, slide = 0 } = {}) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now());
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now() + duration);
  const g = envGain(duration, peak, attack, duration);
  osc.connect(g);
  osc.start();
  osc.stop(now() + duration + 0.05);
}

function startDrone() {
  if (!ctx || drone) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 38;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.0;
  osc.connect(rumbleGain);
  rumbleGain.connect(master);
  osc.start();
  lfo.start();
  drone = osc;

  meteorOsc = ctx.createOscillator();
  meteorOsc.type = "sawtooth";
  meteorOsc.frequency.value = 90;
  const meteorFilter = ctx.createBiquadFilter();
  meteorFilter.type = "lowpass";
  meteorFilter.frequency.value = 280;
  meteorGain = ctx.createGain();
  meteorGain.gain.value = 0;
  meteorOsc.connect(meteorFilter);
  meteorFilter.connect(meteorGain);
  meteorGain.connect(master);
  meteorOsc.start();
}

function playExplosion() {
  tone(42, 1.8, { type: "sine", peak: 0.7, attack: 0.004, slide: -22 });
  tone(78, 1.1, { type: "triangle", peak: 0.35, attack: 0.006, slide: -40 });
  noise(1.4, { filterType: "lowpass", freq: 220, peak: 0.55, attack: 0.002 });
  noise(0.45, { filterType: "highpass", freq: 1800, Q: 0.6, peak: 0.32, attack: 0.001 });
  noise(0.9, { filterType: "bandpass", freq: 420, Q: 1.4, peak: 0.22, attack: 0.02 });
  window.setTimeout(() => {
    if (!unlocked || !ctx) return;
    noise(0.8, { filterType: "bandpass", freq: 180, Q: 0.8, peak: 0.18, attack: 0.04 });
    tone(55, 0.7, { type: "sine", peak: 0.12, attack: 0.05, slide: -20 });
  }, 180);
}

function playMeteorWhoosh() {
  noise(1.6, { filterType: "bandpass", freq: 900, Q: 2.2, peak: 0.22, attack: 0.08 });
  tone(220, 1.4, { type: "sawtooth", peak: 0.08, attack: 0.12, slide: 480 });
}

function playPaper() {
  noise(0.28, { filterType: "bandpass", freq: 2400, Q: 1.1, peak: 0.16, attack: 0.002 });
  noise(0.18, { filterType: "highpass", freq: 4200, peak: 0.08, attack: 0.001 });
}

function playLift() {
  tone(180, 0.7, { type: "sine", peak: 0.08, attack: 0.04, slide: 90 });
  noise(0.5, { filterType: "lowpass", freq: 500, peak: 0.1, attack: 0.03 });
}

function playScan() {
  tone(1480, 0.18, { type: "square", peak: 0.05, attack: 0.002, slide: 400 });
  window.setTimeout(() => {
    if (!unlocked || !ctx) return;
    tone(1880, 0.14, { type: "square", peak: 0.04, attack: 0.002, slide: 220 });
  }, 90);
}

function playChime() {
  tone(523, 0.55, { type: "sine", peak: 0.09, attack: 0.01 });
  tone(784, 0.7, { type: "sine", peak: 0.06, attack: 0.02 });
  tone(1046, 0.9, { type: "triangle", peak: 0.04, attack: 0.03 });
}

function playWhoosh() {
  noise(0.55, { filterType: "lowpass", freq: 340, peak: 0.16, attack: 0.04 });
  tone(140, 0.5, { type: "sine", peak: 0.07, attack: 0.05, slide: -60 });
}

function playCore() {
  tone(48, 1.2, { type: "sine", peak: 0.35, attack: 0.01, slide: -12 });
  noise(0.6, { filterType: "lowpass", freq: 180, peak: 0.2, attack: 0.008 });
  playChime();
}

export function playGunshot() {
  if (!unlocked && !experienceStore.reducedMotion) unlockCinemaAudio();
  if (!ctx || experienceStore.reducedMotion) return;
  tone(90, 0.28, { type: "sine", peak: 0.55, attack: 0.001, slide: -50 });
  tone(180, 0.12, { type: "triangle", peak: 0.25, attack: 0.001, slide: -80 });
  noise(0.22, { filterType: "lowpass", freq: 900, peak: 0.7, attack: 0.0008 });
  noise(0.09, { filterType: "highpass", freq: 3500, peak: 0.45, attack: 0.0005 });
  noise(0.35, { filterType: "bandpass", freq: 240, Q: 1.8, peak: 0.18, attack: 0.01 });
}

export function playRangeOpen() {
  if (!unlocked && !experienceStore.reducedMotion) unlockCinemaAudio();
  if (!ctx || experienceStore.reducedMotion) return;
  playWhoosh();
  playChime();
}

function once(key, fn) {
  if (fired.has(key)) return;
  fired.add(key);
  fn();
}

export function tickCinemaAudio(raw, story) {
  if (experienceStore.reducedMotion || !unlocked || !ctx) {
    lastRaw = raw;
    lastStory = story;
    return;
  }

  const t = now();
  if (rumbleGain) {
    const space = raw < BOOM.end ? 0.12 * (1 - raw / BOOM.end) : 0;
    rumbleGain.gain.setTargetAtTime(space, t, 0.12);
  }
  if (meteorGain && meteorOsc) {
    const incoming = raw >= METEOR.appear && raw < METEOR.strike;
    const u = incoming ? (raw - METEOR.appear) / Math.max(0.001, METEOR.strike - METEOR.appear) : 0;
    meteorGain.gain.setTargetAtTime(incoming ? 0.02 + u * 0.16 : 0, t, 0.08);
    meteorOsc.frequency.setTargetAtTime(70 + u * 420, t, 0.1);
  }

  const crossed = (threshold) => lastRaw < threshold && raw >= threshold;

  if (crossed(0.012)) once("meteor", playMeteorWhoosh);
  if (crossed(BOOM.start)) once("boom", playExplosion);
  if (lastStory < 0.02 && story >= 0.02) once("paper", playPaper);
  if (lastStory < 0.12 && story >= 0.12) once("lift", playLift);
  if (lastStory < 0.175 && story >= 0.175) once("scan0", playScan);
  if (lastStory < 0.235 && story >= 0.235) once("scan1", playScan);
  if (lastStory < 0.28 && story >= 0.28) once("morph", playWhoosh);
  if (lastStory < 0.36 && story >= 0.36) once("ui", playChime);
  if (lastStory < 0.4 && story >= 0.4) once("scan2", playScan);
  if (lastStory < 0.5 && story >= 0.5) once("layers", playWhoosh);
  if (lastStory < 0.62 && story >= 0.62) once("backend", playWhoosh);
  if (lastStory < 0.82 && story >= 0.82) once("core", playCore);
  if (lastStory < 0.96 && story >= 0.96) once("logo", playChime);

  lastRaw = raw;
  lastStory = story;
}
