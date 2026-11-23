// Sons très légers générés localement (aucun fichier, aucun service payant).
// Désactivés par défaut : rien ne se déclenche sans le choix explicite du joueur.
import type { Preferences } from "./prefs.ts";

type SoundName = "turn" | "send" | "reveal" | "join";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
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

/** Joue un son court si le joueur l'a activé ; ne lève jamais d'erreur. */
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
