import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Path,
  RepeatWrapping,
  Shape,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { mmCanvasTexture } from "@/lib/three/canvas-texture";
import { box, cylZ, extrude, merge } from "@/lib/three/csg";
import { circleHole, roundPolygon } from "@/lib/three/shapes";
import { M } from "../materials";

/*
 * PCB helpers. Board-local frame: origin at the outline centre, the FRONT face
 * (the side facing the Game Boy's screen) at z = 0, the board running back to
 * z = −thickness.
 */

export interface BoardHole {
  pos: [number, number];
  d: number;
}

function outlineShape(
  pts: [number, number][],
  holes: BoardHole[],
  mirror: boolean,
  cornerRadius = 0.5,
) {
  const s = mirror ? -1 : 1;
  const raw = pts.map(([x, y]) => new Vector2(x * s, y));
  // Only fillet the four outer corners (points far from notches).
  const radii = pts.map(([x, y], i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const sharp =
      Math.abs(prev[0] - x) + Math.abs(prev[1] - y) > 2 &&
      Math.abs(next[0] - x) + Math.abs(next[1] - y) > 2;
    return sharp ? cornerRadius : 0;
  });
  const v = roundPolygon(raw, radii, 4);
  const shape = new Shape();
  v.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });
  shape.closePath();
  for (const h of holes)
    shape.holes.push(circleHole(h.d / 2, h.pos[0] * s, h.pos[1]) as Path);
  return shape;
}

export interface BoardOptions {
  outline: [number, number][];
  holes: BoardHole[];
  thickness: number;
  /** Paints the front face in board coordinates (mm, +Y up, origin centre). */
  paintFront?: (ctx: CanvasRenderingContext2D) => void;
  /** Paints the back face in back-view coordinates (x mirrored, as seen from behind). */
  paintBack?: (ctx: CanvasRenderingContext2D) => void;
  frontColor: string;
  backColor: string;
  edgeColor?: string;
}

function faceTexture(
  w: number,
  h: number,
  base: string,
  paint: ((ctx: CanvasRenderingContext2D) => void) | undefined,
  mirror: boolean,
) {
  const tex = mmCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      // Convert to centred, +Y-up board coordinates.
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, -1);
      paint?.(ctx);
    },
    14,
  );
  tex.wrapS = tex.wrapT = RepeatWrapping;
  // Cap UVs are the shape's own (x, y) in mm. The back is painted as seen from
  // behind, so its u axis runs the other way.
  tex.repeat.set((mirror ? -1 : 1) / w, 1 / h);
  tex.offset.set(0.5, 0.5);
  return tex;
}

/**
 * Reorders an extruded slab's triangles into three material groups: front
 * cap (+Z), back cap (−Z) and the edge. One mesh, so no coplanar layers to
 * z-fight.
 */
function splitCaps(g: BufferGeometry) {
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.attributes.position.array as Float32Array;
  const uv = src.attributes.uv.array as Float32Array;
  const buckets: number[][] = [[], [], []];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let t = 0; t < pos.length / 9; t++) {
    a.fromArray(pos, t * 9);
    b.fromArray(pos, t * 9 + 3);
    c.fromArray(pos, t * 9 + 6);
    const nz = b.clone().sub(a).cross(c.clone().sub(a)).normalize().z;
    buckets[nz > 0.9 ? 0 : nz < -0.9 ? 1 : 2].push(t);
  }
  const order = [...buckets[0], ...buckets[1], ...buckets[2]];
  const P = new Float32Array(order.length * 9);
  const U = new Float32Array(order.length * 6);
  order.forEach((t, i) => {
    P.set(pos.subarray(t * 9, t * 9 + 9), i * 9);
    U.set(uv.subarray(t * 6, t * 6 + 6), i * 6);
  });
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(P, 3));
  out.setAttribute("uv", new Float32BufferAttribute(U, 2));
  out.addGroup(0, buckets[0].length * 3, 0);
  out.addGroup(buckets[0].length * 3, buckets[1].length * 3, 1);
  out.addGroup(
    (buckets[0].length + buckets[1].length) * 3,
    buckets[2].length * 3,
    2,
  );
  out.computeVertexNormals();
  return out;
}

/** A board as one slab: textured front and back caps, FR-4 coloured edge. */
export function buildBoard(o: BoardOptions) {
  const g = new Group();
  const xs = o.outline.map((p) => Math.abs(p[0]));
  const ys = o.outline.map((p) => Math.abs(p[1]));
  const w = Math.max(...xs) * 2 + 2;
  const h = Math.max(...ys) * 2 + 2;

  const slab = new ExtrudeGeometry(outlineShape(o.outline, o.holes, false), {
    depth: o.thickness,
    bevelEnabled: false,
    curveSegments: 12,
  });
  slab.translate(0, 0, -o.thickness);
  const face = (
    base: string,
    paint: BoardOptions["paintFront"],
    mirror: boolean,
  ) =>
    new MeshStandardMaterial({
      map: faceTexture(w, h, base, paint, mirror),
      roughness: 0.42,
      metalness: 0.05,
    });
  g.add(
    new Mesh(splitCaps(slab), [
      face(o.frontColor, o.paintFront, false),
      face(o.backColor, o.paintBack, true),
      new MeshStandardMaterial({
        color: o.edgeColor ?? "#c9c08a",
        roughness: 0.8,
      }),
    ]),
  );
  return g;
}

/* ------------------------- small THT components ------------------------ */

/** Solder joint (cone fillet + cut lead) on a face; dir = +1 up from z=0, −1 down. */
export function solderJoints(
  points: [number, number][],
  z: number,
  dir: 1 | -1,
) {
  const geos: BufferGeometry[] = [];
  for (const [x, y] of points) {
    const c = new ConeGeometry(0.75, 0.7, 10);
    c.rotateX(dir === 1 ? Math.PI / 2 : -Math.PI / 2);
    c.translate(x, y, z + dir * 0.35);
    const lead = new CylinderGeometry(0.28, 0.28, 1.3, 6);
    lead.rotateX(Math.PI / 2);
    lead.translate(x, y, z + dir * 0.65);
    geos.push(c, lead);
  }
  return new Mesh(merge(geos), M.solder());
}

const bandColors: Record<string, string> = {
  black: "#111111",
  brown: "#6b3a1e",
  red: "#c0281e",
  orange: "#e0731c",
  yellow: "#e8c51c",
  green: "#2e8a3e",
  blue: "#2b55b8",
  violet: "#7a3fb0",
  grey: "#8a8a8a",
  white: "#f0f0f0",
  gold: "#c9a43c",
};

/** Axial part lying along its local X, leads bent down to pads ±pitch/2. dir −1 = hangs below z. */
export function axial(opts: {
  length: number;
  d: number;
  pitch: number;
  color: string;
  bands?: string[];
  glass?: boolean;
  dir?: 1 | -1;
}) {
  const g = new Group();
  const dir = opts.dir ?? -1;
  const r = opts.d / 2;
  const zc = dir * (r + 0.4);
  const body = new CylinderGeometry(r, r, opts.length, 16);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0, zc);
  g.add(
    new Mesh(
      body,
      new MeshStandardMaterial({
        color: opts.color,
        roughness: opts.glass ? 0.15 : 0.5,
        transparent: !!opts.glass,
        opacity: opts.glass ? 0.85 : 1,
      }),
    ),
  );
  opts.bands?.forEach((b, i) => {
    const t = new TorusGeometry(r * 0.98, 0.12, 4, 16);
    t.rotateY(Math.PI / 2);
    t.translate(-opts.length / 2 + 0.55 + i * 0.6, 0, zc);
    g.add(
      new Mesh(
        t,
        new MeshStandardMaterial({ color: bandColors[b] ?? b, roughness: 0.5 }),
      ),
    );
  });
  const half = opts.pitch / 2;
  const leads = [
    box(
      half - opts.length / 2,
      0.45,
      0.45,
      (half + opts.length / 2) / 2,
      0,
      zc,
    ),
    box(
      half - opts.length / 2,
      0.45,
      0.45,
      -(half + opts.length / 2) / 2,
      0,
      zc,
    ),
    box(0.45, 0.45, Math.abs(zc), half, 0, zc / 2),
    box(0.45, 0.45, Math.abs(zc), -half, 0, zc / 2),
  ];
  g.add(new Mesh(merge(leads), M.solder()));
  return g;
}

/** Radial electrolytic lying on its side along local X (leads at +X end). */
export function lyingElectrolytic(d: number, l: number, dir: 1 | -1 = -1) {
  const g = new Group();
  const r = d / 2;
  const zc = dir * (r + 0.2);
  const body = new CylinderGeometry(r, r, l - 0.3, 24);
  body.rotateZ(Math.PI / 2);
  body.translate(-0.15, 0, zc);
  g.add(new Mesh(body, M.capBlack()));
  const top = new CylinderGeometry(r * 0.9, r * 0.9, 0.3, 24);
  top.rotateZ(Math.PI / 2);
  top.translate(-l / 2 + 0.1, 0, zc);
  g.add(new Mesh(top, M.capTop()));
  const stripe = new CylinderGeometry(
    r + 0.02,
    r + 0.02,
    l - 1.2,
    12,
    1,
    true,
    0,
    0.9,
  );
  stripe.rotateZ(Math.PI / 2);
  stripe.translate(0, 0, zc);
  g.add(new Mesh(stripe, M.plasticWhite()));
  return g;
}

/** Ceramic disc capacitor, bent over at `tilt` so it stays low. */
export function ceramicDisc(
  d: number,
  padAxis: "x" | "y",
  dir: 1 | -1 = -1,
  tilt = 0.9,
) {
  const g = new Group();
  const disc = new CylinderGeometry(d / 2, d / 2, 2.0, 24);
  disc.scale(1, 1, 1);
  // Disc axis initially Y; stand it so its face is normal to the board's other axis.
  const m = new Mesh(
    disc,
    new MeshStandardMaterial({ color: "#c47a3e", roughness: 0.6 }),
  );
  const holder = new Group();
  holder.add(m);
  m.position.z = dir * (d / 2 + 0.6);
  holder.rotation.x = dir * -tilt;
  if (padAxis === "x") g.rotation.z = 0;
  else g.rotation.z = Math.PI / 2;
  g.add(holder);
  const legs = [-1.25, 1.25].map((x) => box(0.4, 0.4, 1.4, x, 0, dir * 0.7));
  g.add(new Mesh(merge(legs), M.solder()));
  return g;
}

/** Knurled thumbwheel: Ø × thickness with `teeth` straight knurls, axis along Z. */
export function thumbwheel(diameter: number, thickness: number, teeth = 60) {
  const r = diameter / 2;
  const pts: Vector2[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r - 0.4;
    pts.push(new Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  const s = new Shape(pts);
  s.holes.push(circleHole(0.8, 0, 0) as Path);
  const wheel = extrude(s, thickness, -thickness / 2, 0.15, 1, 2);
  // Face dish Ø10.8 × 0.6 (a shallow ring step reads as the dish).
  const dish = new TorusGeometry(5.4, 0.18, 6, 48);
  dish.translate(0, 0, thickness / 2);
  const hub = cylZ(0.8, thickness + 0.4, 0, 0, 0, 16);
  return merge([wheel, dish, hub]);
}

export const PCB_COLORS = {
  maskCopper: "#4f8a52",
  maskLaminate: "#0e6b4a",
  silk: "#f1f1ea",
  tin: "#bdbdb5",
  shield: "#d9906a",
};

/** Upright text in a +Y-up board canvas (the canvas is pre-flipped). */
export function boardText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: {
    align?: CanvasTextAlign;
    weight?: number;
    rot?: number;
    color?: string;
  } = {},
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  if (opts.rot) ctx.rotate(-opts.rot);
  ctx.fillStyle = opts.color ?? PCB_COLORS.silk;
  ctx.font = `${opts.weight ?? 600} ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = opts.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
