import {
  CanvasTexture,
  MeshStandardMaterial,
  NearestFilter,
  SRGBColorSpace,
} from "three";

/** The DMG's four-shade STN palette (lightest → darkest) plus the "off" glass. */
export const LCD_PALETTE = ["#8e8c2c", "#6b6f27", "#4a5321", "#2b3318"];
export const LCD_OFF = "#8e8c2c";

const W = 160;
const H = 144;

let canvas: HTMLCanvasElement | null = null;
let texture: CanvasTexture | null = null;
let material: MeshStandardMaterial | null = null;

function ensure() {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.fillStyle = LCD_OFF;
      ctx.fillRect(0, 0, W, H);
    }
    texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    material = new MeshStandardMaterial({
      map: texture,
      roughness: 0.38,
      metalness: 0,
    });
  }
  return {
    canvas: canvas as HTMLCanvasElement,
    texture: texture as CanvasTexture,
    material: material as MeshStandardMaterial,
  };
}

/** Shared material for the 160×144 active area of every LCD instance. */
export const screenMaterial = () => ensure().material;

const hexToRgb = (h: string) => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
];
const PAL = LCD_PALETTE.map(hexToRgb);

/**
 * Paints one frame. `draw` uses a plain 2D context at 160×144; the result is
 * then quantised to the 4-shade palette so text renders as real LCD pixels.
 */
export function paintScreen(draw: (ctx: CanvasRenderingContext2D) => void) {
  const { canvas, texture } = ensure();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.save();
  draw(ctx);
  ctx.restore();
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    const idx = Math.min(3, Math.max(0, Math.round((1 - lum) * 3)));
    const c = PAL[idx];
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  texture.needsUpdate = true;
}

export function paintScreenOff() {
  const { canvas, texture } = ensure();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.fillStyle = LCD_OFF;
  ctx.fillRect(0, 0, W, H);
  texture.needsUpdate = true;
}

export const SCREEN_SIZE = { w: W, h: H };
