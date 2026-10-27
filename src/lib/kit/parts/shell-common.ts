import {
  BufferGeometry,
  Float32BufferAttribute,
  BufferGeometry as Geo,
  ShapeUtils,
  Vector2,
  type Vector3,
} from "three";

/*
 * The DMG body in plan (front view, device frame): 90 × 148 mm with R2.5 top
 * corners, R4.5 bottom-left and the signature R18.2 bottom-right corner
 * (centre 27, −56). Values from a caliper-measured CAD of an original.
 */
export const BODY = {
  w: 90,
  h: 148,
  r: { tl: 3, tr: 3, bl: 3, br: 18 },
};

/** Measured CAD Z frame (32.25 mm deep). */
export const ZF = { front: 16.125, back: -16.125, seam: 3.125 };

export interface EdgeRadii {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Inset of a rounded edge of radius R at depth t from the outer face. */
const insetAt = (R: number, t: number) =>
  t >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - t) * (R - t)));

const CORNER_SEG = { tl: 6, tr: 6, bl: 8, br: 28 };

/** Samples the body outline inset per side; constant vertex count. */
export function outlineRing(d: EdgeRadii): Vector2[] {
  const x0 = -BODY.w / 2 + d.left;
  const x1 = BODY.w / 2 - d.right;
  const y0 = -BODY.h / 2 + d.bottom;
  const y1 = BODY.h / 2 - d.top;
  const r = BODY.r;
  const rad = (base: number, a: number, b: number) =>
    Math.max(base - Math.min(a, b) * 0.6, Math.min(base, 0.8));
  const corners: [number, number, number, number, number][] = [
    // cx, cy, radius, startAngle, segments  (CCW from bottom-right)
    [
      x1 - rad(r.br, d.right, d.bottom),
      y0 + rad(r.br, d.right, d.bottom),
      rad(r.br, d.right, d.bottom),
      -Math.PI / 2,
      CORNER_SEG.br,
    ],
    [
      x1 - rad(r.tr, d.right, d.top),
      y1 - rad(r.tr, d.right, d.top),
      rad(r.tr, d.right, d.top),
      0,
      CORNER_SEG.tr,
    ],
    [
      x0 + rad(r.tl, d.left, d.top),
      y1 - rad(r.tl, d.left, d.top),
      rad(r.tl, d.left, d.top),
      Math.PI / 2,
      CORNER_SEG.tl,
    ],
    [
      x0 + rad(r.bl, d.left, d.bottom),
      y0 + rad(r.bl, d.left, d.bottom),
      rad(r.bl, d.left, d.bottom),
      Math.PI,
      CORNER_SEG.bl,
    ],
  ];
  const pts: Vector2[] = [];
  for (const [cx, cy, rr, a0, seg] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (Math.PI / 2) * (i / seg);
      pts.push(new Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
  }
  return pts;
}

/**
 * Closed solid of the body between `zOuter` (the rounded face: back face for
 * the rear housing, front face for the front housing) and `zSeam` (flat
 * parting face). `edge` gives the fillet radius along each side; `grow`
 * expands/shrinks the outline uniformly (negative = inset for cavities).
 */
export function bodySolid(
  zOuter: number,
  zSeam: number,
  edge: EdgeRadii,
  grow = 0,
  steps = 12,
  /** Wall draft: extra inset per mm away from the seam (tan of draft angle). */
  draft = 0,
) {
  const dir = Math.sign(zSeam - zOuter);
  const maxR = Math.max(edge.left, edge.right, edge.top, edge.bottom);
  const ts: number[] = [];
  for (let i = 0; i <= steps; i++)
    ts.push(maxR * (1 - Math.cos((i / steps) * (Math.PI / 2))));
  const rings: { z: number; pts: Vector2[] }[] = ts.map((t) => {
    const z = zOuter + dir * t;
    const dr = draft * Math.abs(z - zSeam) - grow;
    return {
      z,
      pts: outlineRing({
        left: insetAt(edge.left, t) + dr,
        right: insetAt(edge.right, t) + dr,
        top: insetAt(edge.top, t) + dr,
        bottom: insetAt(edge.bottom, t) + dr,
      }),
    };
  });
  rings.push({
    z: zSeam,
    pts: outlineRing({ left: -grow, right: -grow, top: -grow, bottom: -grow }),
  });

  const pos: number[] = [];
  const n = rings[0].pts.length;
  const push = (p: Vector2, z: number) => pos.push(p.x, p.y, z);
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r];
    const B = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // Keep outward-facing winding regardless of build direction.
      if (dir > 0) {
        push(A.pts[i], A.z);
        push(A.pts[j], A.z);
        push(B.pts[j], B.z);
        push(A.pts[i], A.z);
        push(B.pts[j], B.z);
        push(B.pts[i], B.z);
      } else {
        push(A.pts[i], A.z);
        push(B.pts[j], B.z);
        push(A.pts[j], A.z);
        push(A.pts[i], A.z);
        push(B.pts[i], B.z);
        push(B.pts[j], B.z);
      }
    }
  }
  const cap = (ring: { z: number; pts: Vector2[] }, facing: number) => {
    const tris = ShapeUtils.triangulateShape(ring.pts, []);
    const ccw = !ShapeUtils.isClockWise(ring.pts);
    for (const [a, b, c] of tris) {
      const flip = facing > 0 !== ccw;
      const [p, q, s] = flip ? [a, c, b] : [a, b, c];
      push(ring.pts[p], ring.z);
      push(ring.pts[q], ring.z);
      push(ring.pts[s], ring.z);
    }
  };
  cap(rings[0], -dir);
  cap(rings[rings.length - 1], dir);

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Closed solid lofted through rings of equal vertex count (first and last
 * rings capped). Used for dish and countersink cutters.
 */
export function loftSolid(rings: { z: number; pts: Vector2[] }[]) {
  const pos: number[] = [];
  const n = rings[0].pts.length;
  const push = (p: Vector2, z: number) => pos.push(p.x, p.y, z);
  const ccw = !ShapeUtils.isClockWise(rings[0].pts);
  const up = rings[rings.length - 1].z > rings[0].z;
  const flipSide = ccw !== up;
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r];
    const B = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const quad = [A.pts[i], A.pts[j], B.pts[j], B.pts[i]];
      const zs = [A.z, A.z, B.z, B.z];
      const order = flipSide ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const k of order) push(quad[k], zs[k]);
    }
  }
  const cap = (ring: { z: number; pts: Vector2[] }, facingUp: boolean) => {
    const tris = ShapeUtils.triangulateShape(ring.pts, []);
    for (const [a, b, c] of tris) {
      const flip = facingUp !== ccw;
      const [p, q, s] = flip ? [a, c, b] : [a, b, c];
      push(ring.pts[p], ring.z);
      push(ring.pts[q], ring.z);
      push(ring.pts[s], ring.z);
    }
  };
  cap(rings[0], !up);
  cap(rings[rings.length - 1], up);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Stadium (or circle when len = 0) ring of `seg` points per end. */
export function stadiumRing(
  cx: number,
  cy: number,
  len: number,
  r: number,
  angle: number,
  seg = 20,
) {
  const pts: Vector2[] = [];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const h = len / 2;
  for (const [end, a0] of [
    [h, -Math.PI / 2],
    [-h, Math.PI / 2],
  ] as [number, number][]) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (Math.PI * i) / seg;
      const lx = end + Math.cos(a) * r;
      const ly = Math.sin(a) * r;
      pts.push(new Vector2(cx + lx * c - ly * s, cy + lx * s + ly * c));
    }
  }
  return pts;
}

/** Rectangular-section tube swept along a polyline with given surface normals. */
export function sweepGroove(
  rawPoints: Vector3[],
  rawNormals: Vector3[],
  widthAxis: Vector3,
  width: number,
  depth: number,
) {
  // Drop near-duplicate samples: zero-length segments make degenerate faces
  // that confuse the CSG inside/outside test.
  const points: Vector3[] = [];
  const normals: Vector3[] = [];
  rawPoints.forEach((p, i) => {
    if (points.length && points[points.length - 1].distanceTo(p) < 0.05) return;
    points.push(p);
    normals.push(rawNormals[i]);
  });
  const ring = (i: number) => {
    const p = points[i];
    const n = normals[i];
    const out = n.clone().multiplyScalar(depth);
    const inn = n.clone().multiplyScalar(-depth);
    const w = widthAxis.clone().multiplyScalar(width / 2);
    return [
      p.clone().add(inn).sub(w),
      p.clone().add(inn).add(w),
      p.clone().add(out).add(w),
      p.clone().add(out).sub(w),
    ];
  };
  const rings = points.map((_, i) => ring(i));
  const pos: number[] = [];
  const tri = (a: Vector3, b: Vector3, c: Vector3) =>
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      tri(A[k], B[k], B[k2]);
      tri(A[k], B[k2], A[k2]);
    }
  }
  const s = rings[0];
  const e = rings[rings.length - 1];
  tri(s[0], s[2], s[1]);
  tri(s[0], s[3], s[2]);
  tri(e[0], e[1], e[2]);
  tri(e[0], e[2], e[3]);
  const g = new Geo();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Fix winding if the sweep came out inside-out.
  const p = g.attributes.position.array as Float32Array;
  let v = 0;
  for (let i = 0; i < p.length; i += 9)
    v +=
      p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) -
      p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) +
      p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6]);
  if (v < 0) {
    for (let i = 0; i < p.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = p[i + 3 + k];
        p[i + 3 + k] = p[i + 6 + k];
        p[i + 6 + k] = t;
      }
    }
    g.computeVertexNormals();
  }
  return g;
}
