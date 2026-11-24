// Sons d'interface et nappes d'ambiance générés localement avec Web Audio.
// Aucun morceau commercial, fichier distant, service tiers ou téléchargement.
import type { Preferences, Ambience } from "./prefs.ts";

type SoundName = "turn" | "send" | "reveal" | "join";
type AmbientGraph = { output: GainNode; sources: AudioScheduledSourceNode[] };

let context: AudioContext | null = null;
let ambientGraph: AmbientGraph | null = null;
let ambientMode: Ambience = "off";

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return context;
}

const NOTES: Record<SoundName, { frequency: number; delay: number; duration: number }[]> = {
  turn: [{ frequency: 523.25, delay: 0, duration: 0.12 }],
  send: [{ frequency: 587.33, delay: 0, duration: 0.09 }, { frequency: 783.99, delay: 0.07, duration: 0.12 }],
  reveal: [
    { frequency: 523.25, delay: 0, duration: 0.14 },
    { frequency: 659.25, delay: 0.1, duration: 0.16 },
    { frequency: 783.99, delay: 0.2, duration: 0.22 }
  ],
  join: [{ frequency: 440, delay: 0, duration: 0.1 }, { frequency: 659.25, delay: 0.09, duration: 0.14 }]
};

export function playSound(name: SoundName, prefs: Preferences): void {
  if (!prefs.sound || prefs.volume <= 0) return;
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  try {
    for (const note of NOTES[name]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0, now + note.delay);
      gain.gain.linearRampToValueAtTime(0.16 * prefs.volume, now + note.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + note.delay);
      oscillator.stop(now + note.delay + note.duration + 0.02);
    }
  } catch {
    /* audio bloqué par le navigateur : le jeu continue sans son */
  }
}

function fadeOutGraph(ctx: AudioContext, graph: AmbientGraph): void {
  const end = ctx.currentTime + 0.9;
  try {
    graph.output.gain.cancelScheduledValues(ctx.currentTime);
    graph.output.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.18);
    for (const source of graph.sources) source.stop(end);
    window.setTimeout(() => {
      try {
        graph.output.disconnect();
        for (const source of graph.sources) source.disconnect();
      } catch { /* graph déjà libéré */ }
    }, 1200);
  } catch { /* graph déjà arrêté */ }
}

/** Démarre ou remplace une ambiance après une action explicite du joueur. */
export function setAmbience(mode: Ambience, volume: number): void {
  const ctx = audioContext();
  if (!ctx) return;
  if (ambientGraph) {
    fadeOutGraph(ctx, ambientGraph);
    ambientGraph = null;
  }
  ambientMode = mode;
  if (mode === "off" || volume <= 0) return;

  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, ctx.currentTime);
  output.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.075 * Math.min(1, Math.max(0, volume))), ctx.currentTime + 2.2);
  output.connect(ctx.destination);

  const sources: AudioScheduledSourceNode[] = [];
  const addTone = (frequency: number, level: number, detune = 0) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    gain.gain.value = level;
    oscillator.connect(gain).connect(output);
    oscillator.start();
    sources.push(oscillator);
  };

  if (mode === "lounge") {
    addTone(130.81, 0.22, -2);
    addTone(164.81, 0.13, 2);
    addTone(196, 0.08, -1);
  } else if (mode === "velvet") {
    addTone(82.41, 0.25, -1);
    addTone(123.47, 0.15, 2);
    addTone(185, 0.07, -2);
  } else {
    addTone(110, 0.1);
    const length = Math.max(1, Math.floor(ctx.sampleRate * 3));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.22;
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 720;
    noiseGain.gain.value = 0.24;
    noise.connect(filter).connect(noiseGain).connect(output);
    noise.start();
    sources.push(noise);
  }
  ambientGraph = { output, sources };
}

export function stopAmbience(): void {
  if (context && ambientGraph) fadeOutGraph(context, ambientGraph);
  ambientGraph = null;
  ambientMode = "off";
}

export function getActiveAmbience(): Ambience {
  return ambientMode;
}
