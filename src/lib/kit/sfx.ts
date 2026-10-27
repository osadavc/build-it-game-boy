/*
 * Interaction sounds, rendered offline with earshot's sound bank into
 * /public/sfx (see manifest.json there). Played through Web Audio so short
 * clicks start without latency; silently does nothing if a file is missing.
 */

export type SfxEvent =
  | "pickup"
  | "drop"
  | "snap"
  | "seat-board"
  | "screw"
  | "tool"
  | "wrong"
  | "step"
  | "close"
  | "flip"
  | "ribbon"
  | "battery"
  | "switch"
  | "explode"
  | "hint";

interface Entry {
  file: string;
  gain?: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let manifest: Promise<Record<string, Entry>> | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();
const listeners = new Set<(muted: boolean) => void>();

const STORE_KEY = "dmg-kit-muted";
let muted = (() => {
  try {
    return (
      typeof window !== "undefined" && localStorage.getItem(STORE_KEY) === "1"
    );
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(STORE_KEY, m ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the setting just won't persist.
  }
  if (master) master.gain.value = m ? 0 : 0.9;
  for (const l of listeners) l(m);
}

export function onMuteChange(fn: (muted: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function loadManifest() {
  manifest ??= fetch("/sfx/manifest.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return manifest;
}

function load(event: string) {
  let b = buffers.get(event);
  if (!b) {
    b = loadManifest().then(async (m) => {
      const entry = m[event];
      const ac = audio();
      if (!entry || !ac) return null;
      try {
        const res = await fetch(entry.file);
        if (!res.ok) return null;
        return await ac.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    });
    buffers.set(event, b);
  }
  return b;
}

/** Decode every sound up front (call after the first user gesture). */
export function preloadSfx() {
  void loadManifest().then((m) => {
    for (const k of Object.keys(m)) void load(k);
  });
}

export function playSfx(
  event: SfxEvent,
  opts: { delay?: number; gain?: number; rate?: number } = {},
) {
  if (muted) return;
  const ac = audio();
  if (!ac || !master) return;
  const now = performance.now();
  if (now - (lastPlayed.get(event) ?? 0) < 45) return;
  lastPlayed.set(event, now);
  const out = master;
  void Promise.all([load(event), loadManifest()]).then(([buf, m]) => {
    if (!buf) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    // A touch of random pitch keeps repeated clicks from sounding robotic.
    src.playbackRate.value =
      (opts.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.04);
    const g = ac.createGain();
    g.gain.value = (m[event]?.gain ?? 0.8) * (opts.gain ?? 1);
    src.connect(g).connect(out);
    src.start(ac.currentTime + (opts.delay ?? 0) / 1000);
  });
}
