import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  type Shape,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ADDITION,
  Brush,
  Evaluator,
  INTERSECTION,
  SUBTRACTION,
} from "three-bvh-csg";

const evaluator = new Evaluator();
evaluator.attributes = ["position", "normal"];
evaluator.useGroups = false;

function clean(g: BufferGeometry) {
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  }
  g.clearGroups();
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

function run(
  base: BufferGeometry,
  tools: BufferGeometry[],
  op: typeof SUBTRACTION,
) {
  // three-bvh-csg 0.0.18 still passes the deprecated `maxLeafSize` to
  // three-mesh-bvh, which warns once per brush; mute just that message.
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("maxLeafSize")) return;
    warn(...args);
  };
  try {
    let a = new Brush(clean(base));
    a.updateMatrixWorld();
    for (const t of tools) {
      const b = new Brush(clean(t));
      b.updateMatrixWorld();
      a = evaluator.evaluate(a, b, op);
    }
    return a.geometry;
  } finally {
    console.warn = warn;
  }
}

export const subtract = (base: BufferGeometry, ...tools: BufferGeometry[]) =>
  run(base, tools, SUBTRACTION);
export const union = (base: BufferGeometry, ...tools: BufferGeometry[]) =>
  run(base, tools, ADDITION);
export const intersect = (base: BufferGeometry, ...tools: BufferGeometry[]) =>
  run(base, tools, INTERSECTION);

export function merge(geos: BufferGeometry[]) {
  const cleaned = geos.map((g) => clean(g.index ? g.toNonIndexed() : g));
  return mergeGeometries(cleaned, false);
}

/** Axis-aligned box centred at (x, y, z), optionally rotated about Z. */
export function box(
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
  rotZ = 0,
) {
  const g = new BoxGeometry(w, h, d);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(x, y, z);
  return g;
}

/** Cylinder whose axis runs along Z, centred at (x, y, z). */
export function cylZ(
  r: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  seg = 32,
  rTop = r,
) {
  const g = new CylinderGeometry(rTop, r, h, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Cylinder along an arbitrary axis between two points. */
export function cylBetween(r: number, a: Vector3, b: Vector3, seg = 24) {
  const len = a.distanceTo(b);
  const g = new CylinderGeometry(r, r, len, seg);
  const q = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  g.applyMatrix4(
    new Matrix4().compose(
      a.clone().add(b).multiplyScalar(0.5),
      q,
      new Vector3(1, 1, 1),
    ),
  );
  return g;
}

/**
 * Extrudes a shape along +Z from z0 to z0 + depth with an optional rounded
 * bevel. The bevel is kept *inside* the given depth / outline.
 */
export function extrude(
  shape: Shape | Shape[],
  depth: number,
  z0 = 0,
  bevel = 0,
  bevelSegments = 4,
  curveSegments = 24,
) {
  const b = Math.min(bevel, depth / 2 - 0.001);
  const g = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - b * 2),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments,
    curveSegments,
  });
  g.translate(0, 0, z0 + b);
  return g;
}
