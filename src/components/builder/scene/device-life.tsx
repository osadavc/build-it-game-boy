import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { ledMaterial } from "@/lib/kit/materials";
import { paintScreen, paintScreenOff } from "@/lib/kit/screen";
import { isMuted } from "@/lib/kit/sfx";
import { useBuilder } from "@/lib/kit/store";

/** The DMG boot chime: a short 1 kHz blip, then the 2 kHz "ding". */
function playChime() {
  if (isMuted()) return;
  try {
    const ac = new AudioContext();
    const note = (freq: number, at: number, len: number, vol: number) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ac.currentTime + at);
      g.gain.linearRampToValueAtTime(vol, ac.currentTime + at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + len);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + at);
      o.stop(ac.currentTime + at + len + 0.05);
    };
    note(1048.6, 0, 0.09, 0.05);
    note(2097.2, 0.09, 0.9, 0.05);
    setTimeout(() => ac.close(), 1400);
  } catch {
    // Audio is a nicety; ignore autoplay or support failures.
  }
}

const PIECES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

function drawAttract(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 160, 144);
  // A little well with stacked blocks and one piece falling.
  const cell = 7;
  const ox = 8;
  const oy = 4;
  ctx.fillStyle = "#555";
  ctx.fillRect(ox - 2, oy, 2, 20 * cell);
  ctx.fillRect(ox + 10 * cell, oy, 2, 20 * cell);
  const stack = ["0000000000", "1100001110", "1110111111", "1111111101"];
  stack.forEach((row, r) => {
    [...row].forEach((c, k) => {
      if (c === "1") block(ctx, ox + k * cell, oy + (16 + r) * cell, cell);
    });
  });
  const cycle = 3.2;
  const n = Math.floor(t / cycle);
  const piece = PIECES[n % PIECES.length];
  const row = Math.min(14, Math.floor(((t % cycle) / cycle) * 18));
  const col = 3 + (n % 3);
  piece.forEach((r, ri) => {
    r.forEach((c, ci) => {
      if (c) block(ctx, ox + (col + ci) * cell, oy + (row + ri) * cell, cell);
    });
  });
  ctx.fillStyle = "#000";
  ctx.font = "bold 9px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("DMG-01", 90, 22);
  ctx.font = "8px ui-monospace, monospace";
  ctx.fillStyle = "#333";
  ctx.fillText("BUILD", 90, 44);
  ctx.fillText("COMPLETE", 90, 54);
  ctx.fillStyle = "#000";
  ctx.fillText("PARTS", 90, 78);
  ctx.fillText("  100%", 90, 88);
  if (Math.floor(t * 2) % 2 === 0) ctx.fillText("PUSH START", 90, 120);
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "#888";
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
}

/** Power LED, boot logo scroll and chime once the switch goes ON. */
export function DeviceLife() {
  const powered = useBuilder((s) => s.poweredOn);
  const start = useRef(0);
  const chimed = useRef(false);
  const lastPaint = useRef(0);

  useEffect(() => {
    const led = ledMaterial();
    if (powered) {
      start.current = performance.now();
      chimed.current = false;
      led.emissiveIntensity = 3.2;
    } else {
      led.emissiveIntensity = 0;
      paintScreenOff();
    }
  }, [powered]);

  useFrame(() => {
    if (!powered) return;
    const now = performance.now();
    if (now - lastPaint.current < 40) return;
    lastPaint.current = now;
    const t = (now - start.current) / 1000;
    if (t < 0.25) {
      paintScreen((ctx) => {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 160, 144);
      });
      return;
    }
    if (t < 4.6) {
      const y = Math.min(70, -10 + ((t - 0.25) / 2.4) * 80);
      if (t > 2.65 && !chimed.current) {
        chimed.current = true;
        playChime();
      }
      paintScreen((ctx) => {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 160, 144);
        ctx.fillStyle = "#000";
        ctx.font = "bold italic 17px Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nintendo", 78, Math.round(y));
        ctx.font = "bold 6px Arial, sans-serif";
        ctx.fillText("®", 121, Math.round(y) - 10);
      });
      return;
    }
    paintScreen((ctx) => drawAttract(ctx, t - 4.6));
  });

  return null;
}
