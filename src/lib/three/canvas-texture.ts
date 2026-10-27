import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

/** Pixels per millimetre for printed artwork. */
export const PRINT_DPMM = 24;

/**
 * Creates a canvas sized `w × h` mm and lets `draw` paint on it using
 * millimetre units (the context is pre-scaled).
 */
export function mmCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  dpmm = PRINT_DPMM,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(4, Math.round(w * dpmm));
  canvas.height = Math.max(4, Math.round(h * dpmm));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.scale(canvas.width / w, canvas.height / h);
  draw(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * A thin printed decal (ink on a surface), facing +Z, centred at the origin.
 * `draw` uses millimetres with (0,0) at the top-left of the decal.
 */
export function printDecal(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  opts: { roughness?: number; dpmm?: number } = {},
) {
  const map = mmCanvasTexture(w, h, draw, opts.dpmm);
  const mat = new MeshStandardMaterial({
    map,
    transparent: true,
    roughness: opts.roughness ?? 0.55,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(w, h), mat);
  mesh.renderOrder = 2;
  mesh.name = "print";
  return mesh;
}

/** Draws text with letter-spacing in mm (canvas `letterSpacing` support varies). */
export function spacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx =
    align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}
