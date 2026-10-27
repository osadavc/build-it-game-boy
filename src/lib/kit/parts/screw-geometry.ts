import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  type Material,
  Mesh,
  Vector2,
} from "three";
import { box, cylZ, merge, subtract } from "@/lib/three/csg";

export interface ScrewSpec {
  drive: "triwing" | "phillips";
  head: "pan" | "washer" | "flat";
  headD: number;
  headH: number;
  /** Nominal (major) thread diameter. */
  d: number;
  /** Length under the head. */
  length: number;
  pitch: number;
  /** Self-tapping screws have a sharp tip. */
  pointed?: boolean;
}

/** Triangular thread ridge wound around a core, from z0 down to z1 (< z0). */
function threadGeometry(
  rMinor: number,
  rMajor: number,
  pitch: number,
  z0: number,
  z1: number,
  taper: number,
) {
  const seg = 28;
  const turns = (z0 - z1) / pitch;
  const steps = Math.max(8, Math.ceil(turns * seg));
  const pos: number[] = [];
  const half = pitch * 0.38;
  const prof = (i: number) => {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const z = z0 - t * (z0 - z1);
    // Fade the ridge out over the last `taper` mm so the tip stays sharp.
    const fade = Math.min(1, Math.max(0, (z - z1) / Math.max(taper, 1e-3)));
    const fadeIn = Math.min(1, Math.max(0, (z0 - z) / (pitch * 0.6)));
    const R = rMinor + (rMajor - rMinor) * fade * fadeIn;
    const rIn = rMinor * (0.55 + 0.45 * fade);
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [
      [c * rIn, s * rIn, z + half],
      [c * R, s * R, z],
      [c * rIn, s * rIn, z - half],
    ];
  };
  let prev = prof(0);
  for (let i = 1; i <= steps; i++) {
    const cur = prof(i);
    for (let k = 0; k < 2; k++) {
      const a = prev[k];
      const b = prev[k + 1];
      const c = cur[k];
      const d = cur[k + 1];
      pos.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
    prev = cur;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const cache = new Map<
  string,
  { head: BufferGeometry; shank: BufferGeometry }
>();

/**
 * Builds a screw with its head top at z = 0 facing +Z and the shank running
 * down -Z. Geometry is cached per spec.
 */
export function buildScrew(spec: ScrewSpec, mat: Material) {
  const key = JSON.stringify(spec);
  let geo = cache.get(key);
  if (!geo) {
    const { headD, headH, d, length, pitch } = spec;
    const R = headD / 2;
    // Head profile (lathe around Y, then turned to Z).
    const pts: Vector2[] = [];
    if (spec.head === "flat") {
      pts.push(new Vector2(0, headH), new Vector2(R, headH));
      pts.push(new Vector2(R, headH - 0.15), new Vector2(d / 2, 0));
      pts.push(new Vector2(0, 0));
    } else {
      const dome = spec.head === "pan" ? headH * 0.35 : headH * 0.2;
      const flange = spec.head === "washer" ? headH * 0.28 : 0;
      pts.push(new Vector2(0, headH));
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const rr = R * 0.8 * t;
        pts.push(new Vector2(rr, headH - dome * t * t));
      }
      pts.push(new Vector2(R * 0.92, headH - dome - 0.05));
      if (flange) {
        pts.push(new Vector2(R * 0.95, flange + 0.08));
        pts.push(new Vector2(R, flange));
        pts.push(new Vector2(R, 0.05));
      } else {
        pts.push(new Vector2(R, headH - dome - 0.25));
        pts.push(new Vector2(R, 0.08));
      }
      pts.push(new Vector2(R - 0.08, 0));
      pts.push(new Vector2(0, 0));
    }
    let head: BufferGeometry = new LatheGeometry(pts.reverse(), 40);
    head.rotateX(Math.PI / 2);
    head.translate(0, 0, -headH);
    // Recess.
    const depth = Math.min(headH * 0.75, 0.9);
    const tools: BufferGeometry[] = [];
    if (spec.drive === "phillips") {
      const w = Math.max(0.32, headD * 0.09);
      const l = headD * 0.62;
      tools.push(box(l, w, depth * 2, 0, 0, 0));
      tools.push(box(w, l, depth * 2, 0, 0, 0));
      tools.push(cylZ(w * 1.1, depth * 2, 0, 0, 0, 16, w * 1.6));
    } else {
      const w = Math.max(0.36, headD * 0.11);
      const l = headD * 0.34;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + Math.PI / 2;
        // Each wing is offset sideways from the radial line — the tri-wing signature.
        const off = w * 0.32;
        const cx = Math.cos(a) * l * 0.5 - Math.sin(a) * off;
        const cy = Math.sin(a) * l * 0.5 + Math.cos(a) * off;
        tools.push(box(l, w, depth * 2, cx, cy, 0, a));
      }
      tools.push(cylZ(w * 0.75, depth * 2, 0, 0, 0, 12));
    }
    head = subtract(head, ...tools);
    head.computeVertexNormals();

    // Shank with thread and tip.
    const rMinor = (d / 2) * 0.74;
    const tip = spec.pointed ? Math.min(length * 0.3, d * 1.2) : d * 0.2;
    const z0 = -headH;
    const z1 = -headH - length;
    const core = new CylinderGeometry(rMinor, rMinor, length - tip, 20);
    core.rotateX(Math.PI / 2);
    core.translate(0, 0, z0 - (length - tip) / 2);
    const point = new CylinderGeometry(
      rMinor,
      spec.pointed ? 0.05 : rMinor * 0.8,
      tip,
      20,
    );
    point.rotateX(Math.PI / 2);
    point.translate(0, 0, z1 + tip / 2);
    const thread = threadGeometry(
      rMinor * 0.98,
      d / 2,
      pitch,
      z0 - pitch * 0.3,
      z1 + 0.05,
      tip,
    );
    const shank = merge([core, point, thread]);
    geo = { head, shank };
    cache.set(key, geo);
  }
  const g = new Group();
  g.add(new Mesh(geo.head, mat));
  g.add(new Mesh(geo.shank, mat));
  return g;
}
