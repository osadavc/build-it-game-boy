import { Path, Shape, Vector2 } from "three";

export interface Radii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

const toRadii = (r: number | Radii): Radii =>
  typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;

/** Draws a rounded rectangle centred on (cx, cy) into `p` (counter-clockwise). */
export function drawRoundedRect<T extends Path>(
  p: T,
  w: number,
  h: number,
  radii: number | Radii,
  cx = 0,
  cy = 0,
): T {
  const r = toRadii(radii);
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const x1 = cx + w / 2;
  const y1 = cy + h / 2;
  p.moveTo(x0 + r.bl, y0);
  p.lineTo(x1 - r.br, y0);
  if (r.br > 0) p.absarc(x1 - r.br, y0 + r.br, r.br, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - r.tr);
  if (r.tr > 0) p.absarc(x1 - r.tr, y1 - r.tr, r.tr, 0, Math.PI / 2, false);
  p.lineTo(x0 + r.tl, y1);
  if (r.tl > 0)
    p.absarc(x0 + r.tl, y1 - r.tl, r.tl, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + r.bl);
  if (r.bl > 0)
    p.absarc(x0 + r.bl, y0 + r.bl, r.bl, Math.PI, Math.PI * 1.5, false);
  return p;
}

export const roundedRectShape = (
  w: number,
  h: number,
  r: number | Radii,
  cx = 0,
  cy = 0,
) => drawRoundedRect(new Shape(), w, h, r, cx, cy);

export const roundedRectPath = (
  w: number,
  h: number,
  r: number | Radii,
  cx = 0,
  cy = 0,
) => drawRoundedRect(new Path(), w, h, r, cx, cy);

export function circlePath<T extends Path>(p: T, r: number, cx = 0, cy = 0): T {
  p.moveTo(cx + r, cy);
  p.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return p;
}

export const circleShape = (r: number, cx = 0, cy = 0) =>
  circlePath(new Shape(), r, cx, cy);
export const circleHole = (r: number, cx = 0, cy = 0) =>
  circlePath(new Path(), r, cx, cy);

/** Stadium / pill of total length `len` and width `w`, rotated by `angle`. */
export function drawPill<T extends Path>(
  p: T,
  len: number,
  w: number,
  angle = 0,
  cx = 0,
  cy = 0,
): T {
  const r = w / 2;
  const half = Math.max(0, len / 2 - r);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tx = (x: number, y: number) =>
    [cx + x * c - y * s, cy + x * s + y * c] as const;
  const steps = 16;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([half + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([-half + r * Math.cos(a), r * Math.sin(a)]);
  }
  pts.forEach(([x, y], i) => {
    const [X, Y] = tx(x, y);
    if (i === 0) p.moveTo(X, Y);
    else p.lineTo(X, Y);
  });
  p.closePath();
  return p;
}

export const pillShape = (len: number, w: number, angle = 0, cx = 0, cy = 0) =>
  drawPill(new Shape(), len, w, angle, cx, cy);
export const pillHole = (len: number, w: number, angle = 0, cx = 0, cy = 0) =>
  drawPill(new Path(), len, w, angle, cx, cy);

/**
 * Plus/cross outline with arm width `arm` and tip-to-tip `span`. Outer
 * corners are rounded by `rOuter`, inner (re-entrant) corners by `rInner`.
 */
export function drawCross<T extends Path>(
  p: T,
  span: number,
  arm: number,
  rOuter = 0.6,
  rInner = 0.6,
  cx = 0,
  cy = 0,
): T {
  const a = arm / 2;
  const s = span / 2;
  // Walk the 12 corners counter-clockwise, starting at the right arm bottom.
  const corners: [number, number, "o" | "i"][] = [
    [s, -a, "o"],
    [s, a, "o"],
    [a, a, "i"],
    [a, s, "o"],
    [-a, s, "o"],
    [-a, a, "i"],
    [-s, a, "o"],
    [-s, -a, "o"],
    [-a, -a, "i"],
    [-a, -s, "o"],
    [a, -s, "o"],
    [a, -a, "i"],
  ];
  const pts = roundPolygon(
    corners.map(([x, y]) => new Vector2(x + cx, y + cy)),
    corners.map(([, , t]) => (t === "o" ? rOuter : rInner)),
  );
  pts.forEach((v, i) => {
    if (i === 0) p.moveTo(v.x, v.y);
    else p.lineTo(v.x, v.y);
  });
  p.closePath();
  return p;
}

export const crossShape = (
  span: number,
  arm: number,
  rOuter?: number,
  rInner?: number,
  cx = 0,
  cy = 0,
) => drawCross(new Shape(), span, arm, rOuter, rInner, cx, cy);
export const crossHole = (
  span: number,
  arm: number,
  rOuter?: number,
  rInner?: number,
  cx = 0,
  cy = 0,
) => drawCross(new Path(), span, arm, rOuter, rInner, cx, cy);

/** Fillets every corner of a closed polygon with the given radii. */
export function roundPolygon(
  pts: Vector2[],
  radii: number[] | number,
  seg = 6,
): Vector2[] {
  const out: Vector2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const r = Array.isArray(radii) ? radii[i] : radii;
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    if (r <= 0) {
      out.push(p1.clone());
      continue;
    }
    const d1 = p0.clone().sub(p1).normalize();
    const d2 = p2.clone().sub(p1).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))));
    const t = r / Math.tan(ang / 2);
    const a = p1.clone().add(d1.clone().multiplyScalar(t));
    const b = p1.clone().add(d2.clone().multiplyScalar(t));
    const bis = d1.clone().add(d2).normalize();
    const c = p1.clone().add(bis.multiplyScalar(r / Math.sin(ang / 2)));
    const a0 = Math.atan2(a.y - c.y, a.x - c.x);
    let da = Math.atan2(b.y - c.y, b.x - c.x) - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    for (let k = 0; k <= seg; k++) {
      const aa = a0 + (da * k) / seg;
      out.push(new Vector2(c.x + r * Math.cos(aa), c.y + r * Math.sin(aa)));
    }
  }
  return out;
}

export function polygonShape(
  pts: [number, number][],
  radii: number[] | number = 0,
) {
  const v = roundPolygon(
    pts.map(([x, y]) => new Vector2(x, y)),
    radii,
  );
  const s = new Shape();
  v.forEach((p, i) => {
    if (i === 0) s.moveTo(p.x, p.y);
    else s.lineTo(p.x, p.y);
  });
  s.closePath();
  return s;
}

export function polygonPath(
  pts: [number, number][],
  radii: number[] | number = 0,
) {
  const v = roundPolygon(
    pts.map(([x, y]) => new Vector2(x, y)),
    radii,
  );
  const s = new Path();
  v.forEach((p, i) => {
    if (i === 0) s.moveTo(p.x, p.y);
    else s.lineTo(p.x, p.y);
  });
  s.closePath();
  return s;
}
