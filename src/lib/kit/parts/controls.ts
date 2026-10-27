import {
  type BufferGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import { box, cylZ, extrude, merge, subtract, union } from "@/lib/three/csg";
import {
  circleHole,
  crossShape,
  pillShape,
  polygonShape,
} from "@/lib/three/shapes";
import { domeCap } from "./power";

/*
 * Controls measured from a CAD of an original DMG (±0.2 mm). Every local
 * frame has +Z toward the user (device +Z) and X/Y matching the device.
 */

const dpadMat = new MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.36 });
const abMat = new MeshStandardMaterial({ color: "#a01450", roughness: 0.26 });
const ssMat = new MeshStandardMaterial({ color: "#6e6a74", roughness: 0.9 });
const mintMat = new MeshStandardMaterial({
  color: "#a6d4cc",
  roughness: 0.75,
  transparent: true,
  opacity: 0.94,
});
const creamMat = new MeshStandardMaterial({
  color: "#ece6cf",
  roughness: 0.78,
});
const carbonMat = new MeshStandardMaterial({
  color: "#121212",
  roughness: 0.65,
});

const lathe = (pts: [number, number][], seg = 48) => {
  const g = new LatheGeometry(
    pts.map(([r, z]) => new Vector2(r, z)),
    seg,
  );
  g.rotateX(Math.PI / 2);
  return g;
};

/** Concave sphere used to carve a dish: surface passes through (0,0,zAxis). */
function dishCutter(radius: number, zAxis: number) {
  const s = new SphereGeometry(radius, 72, 36);
  s.translate(0, 0, zAxis + radius);
  return s;
}

/* ------------------------------- D-pad -------------------------------- */

/** Nintendo 18407. Origin on axis at the flange top face. */
export function buildDpad() {
  const SPAN = 20.55;
  const ARM = 6.75;
  // Cross body from below the flange to just above the dished top.
  let cross: BufferGeometry = extrude(
    crossShape(SPAN, ARM, 0.75, 0.4),
    4.5 + 1.7,
    -1.7,
    0.5,
    3,
  );
  cross = subtract(
    cross,
    dishCutter(167, 4.147),
    (() => {
      // Centre dimple Ø5.6 × 1.0 deep.
      const s = new SphereGeometry(4.4, 40, 20);
      s.translate(0, 0, 3.15 + 4.4);
      return s;
    })(),
    // Three stadium grip grooves per arm, 4.45 × 1.05 × 0.3.
    ...[0, 1, 2, 3].flatMap((k) =>
      [4.25, 6.3, 8.4].map((d) => {
        const a = (k * Math.PI) / 2;
        const g = extrude(
          pillShape(
            4.45,
            1.05,
            a + Math.PI / 2,
            Math.cos(a) * d,
            Math.sin(a) * d,
          ),
          2,
          0,
        );
        // Sit the groove 0.3 below the dish surface at that radius.
        g.translate(0, 0, 4.147 + (d * d) / 334 - 0.3);
        return g;
      }),
    ),
  );
  const flange = lathe([
    [0, -1.75],
    [3.4, -1.75],
    [12.8, -1.35],
    [12.8, -0.2],
    [12.6, 0],
    [0, 0],
  ]);
  const nub = new SphereGeometry(
    2.8,
    32,
    16,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  nub.rotateX(Math.PI / 2);
  nub.translate(0, 0, -1.4);
  const nubBase = cylZ(2.8, 0.35, 0, 0, -1.575, 32);
  const g = new Group();
  g.add(new Mesh(merge([cross, flange, nub, nubBase]), dpadMat));
  return g;
}

/* ------------------------------ A / B -------------------------------- */

/** Nintendo 18408 (A and B are the same moulding). Origin on axis, bottom plane. */
export function buildABButton() {
  const R = 5.2;
  const outer = merge([
    lathe(
      [
        [0, 0],
        [R, 0],
        [R, 6.15 - 0.45],
        [R - 0.13, 6.15 - 0.13],
        [R - 0.45, 6.15],
        [0, 6.15],
      ],
      56,
    ),
    (() => {
      const d = domeCap(R - 0.45, 0.8, 48);
      d.rotateX(Math.PI / 2);
      d.translate(0, 0, 6.15);
      return d;
    })(),
  ]);
  let body: BufferGeometry = union(
    outer,
    // Two retention tabs along ±X, 1.95 wide, 2.0 tall, reaching r = 7.8.
    box(15.6, 1.95, 2.0, 0, 0, 1.0),
  );
  body = subtract(body, cylZ(4.25, 11, 0, 0, 0, 40));
  const inner = merge([
    // Ceiling, actuator tube and three ribs inside the bore.
    cylZ(4.3, 0.7, 0, 0, 5.15, 40),
    subtract(cylZ(2.4, 3.2, 0, 0, 3.95, 32), cylZ(0.95, 4, 0, 0, 3.95, 16)),
    box(1.9, 1.0, 3.2, 3.35, 0, 3.95),
    box(1.0, 1.9, 3.2, 0, 3.35, 3.95),
    box(1.0, 1.9, 3.2, 0, -3.35, 3.95),
  ]);
  const g = new Group();
  g.add(new Mesh(merge([body, inner]), abMat));
  return g;
}

/* --------------------------- Start / Select -------------------------- */

const PILL_ANGLE = (25.5 * Math.PI) / 180;

/** Nintendo 18412: one rubber piece, base web + two slanted pills. */
export function buildStartSelect() {
  const base = extrude(
    polygonShape(
      [
        [13.5, 5.4],
        [15.0, 3.6],
        [15.3, 1.8],
        [13.8, -0.9],
        [10.0, -3.5],
        [6.5, -5.4],
        [-13.5, -5.4],
        [-15.0, -3.6],
        [-15.3, -1.8],
        [-13.8, 0.9],
        [-10.0, 3.5],
        [-6.5, 5.4],
      ],
      1.0,
    ),
    1.25,
    0,
  );
  const parts: BufferGeometry[] = [base];
  for (const cx of [-7.325, 7.325]) {
    // Bellows skirt flaring onto the web, then the pill body to z = 8.5.
    const skirt = extrude(
      pillShape(10.3 + 2.4, 2.7 + 2.4, PILL_ANGLE, cx, 0),
      1.35,
      1.25,
      0.3,
    );
    const body = extrude(
      pillShape(10.3, 2.7, PILL_ANGLE, cx, 0),
      8.5 - 2.4,
      2.4,
      0.8,
      4,
    );
    const neck = extrude(
      pillShape(10.3 + 0.8, 2.7 + 0.8, PILL_ANGLE, cx, 0),
      0.6,
      2.2,
      0.25,
    );
    parts.push(skirt, body, neck);
  }
  const rubber = subtract(
    union(base, ...parts.slice(1)),
    cylZ(0.9, 4, 1.875, 3.8, 0, 20),
  );
  const g = new Group();
  g.add(new Mesh(rubber, ssMat));
  // Carbon contacts on the underside of each pill.
  const carbon = [-7.325, 7.325].flatMap((cx) =>
    [-3, 3].map((o) =>
      cylZ(
        1.15,
        0.05,
        cx + Math.cos(PILL_ANGLE) * o,
        Math.sin(PILL_ANGLE) * o,
        -0.03,
        20,
      ),
    ),
  );
  const cm = new Mesh(merge(carbon), carbonMat);
  g.add(cm);
  return g;
}

/* ----------------------------- Membranes ----------------------------- */

function domeProfile(skirtR: number, plungerR: number, top: number) {
  return lathe(
    [
      [0, 1.5],
      [skirtR, 1.5],
      [skirtR - 0.4, 2.2],
      [plungerR + 0.2, Math.max(2.8, top - 1.4)],
      [plungerR, Math.max(3.0, top - 1.2)],
      [plungerR, top - 0.3],
      [plungerR - 0.3, top],
      [0, top],
    ],
    40,
  );
}

/** Nintendo 18410: D-pad rubber contact (mint silicone, 4 domes). */
export function buildDpadMembrane() {
  const pts: [number, number][] = [];
  const radii: number[] = [];
  const arc = (a0: number, a1: number) => {
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      pts.push([Math.cos(a) * 15.2, Math.sin(a) * 15.2]);
      radii.push(0);
    }
  };
  arc(0.02, Math.PI / 2 - 0.02);
  pts.push([0, 15.3], [-8.6, 15.3], [-15.3, 8.6], [-15.3, 0]);
  radii.push(0, 1, 1, 0);
  arc(Math.PI + 0.02, Math.PI * 1.5 - 0.02);
  pts.push([0, -15.3], [8.6, -15.3], [15.3, -8.6], [15.3, 0]);
  radii.push(0, 1, 1, 0);
  const shape = polygonShape(pts, radii);
  shape.holes.push(
    circleHole(0.9, -10.5, 10.25),
    circleHole(0.9, 10.5, -11.0),
    circleHole(3.25, 0, 0),
  );
  const base = extrude(shape, 1.5, 0, 0.3, 2);
  const domes = [
    [0, 8.75],
    [0, -8.75],
    [8.75, 0],
    [-8.75, 0],
  ].map(([x, y]) => {
    const d = domeProfile(3.5, 2.5, 4.525);
    d.translate(x, y, 0);
    return d;
  });
  const g = new Group();
  g.add(new Mesh(merge([base, ...domes]), mintMat));
  const carbon = [
    [0, 8.75],
    [0, -8.75],
    [8.75, 0],
    [-8.75, 0],
  ].map(([x, y]) => cylZ(2.3, 0.05, x, y, -0.03, 24));
  g.add(new Mesh(merge(carbon), carbonMat));
  return g;
}

/** Nintendo 18411: A/B rubber contact (cream silicone, 2 domes). Local +X = B→A. */
export function buildABMembrane() {
  // Stadium body plus two pierced locating lobes. Built by merging (no CSG):
  // the overlap is hidden inside the same rubber.
  const stadium = extrude(pillShape(31.4, 14.8, 0, 0, 0), 1.5, 0, 0.3, 2);
  const lobes = [
    [13.18, -6.26],
    [-12.73, 6.06],
  ];
  const parts: BufferGeometry[] = [stadium];
  for (const [x, y] of lobes) {
    const ring = new Shape();
    ring.absarc(x, y, 2.0, 0, Math.PI * 2, false);
    ring.holes.push(circleHole(0.9, x, y));
    parts.push(extrude(ring, 1.5, 0, 0.2, 1, 20));
    parts.push(box(2.6, 2.6, 1.5, x * 0.88, y * 0.88, 0.75, Math.atan2(y, x)));
  }
  const base = merge(parts);
  const domes = [7.995, -7.995].map((x) => {
    const d = domeProfile(4.1, 2.5, 6.0);
    d.translate(x, 0, 0);
    return d;
  });
  const g = new Group();
  g.add(new Mesh(merge([base, ...domes]), creamMat));
  g.add(
    new Mesh(
      merge([7.995, -7.995].map((x) => cylZ(2.35, 0.05, x, 0, -0.03, 24))),
      carbonMat,
    ),
  );
  return g;
}

export const CONTROL_POS = {
  dpad: [-26.0, -26.5, 13.7] as const,
  a: [32.12, -21.87, 11.125] as const,
  b: [17.62, -28.62, 11.125] as const,
  startSelect: [-4.375, -48.3, 7.475] as const,
  dpadMembrane: [-26.0, -26.5, 7.475] as const,
  abMembrane: [24.87, -25.245, 7.475] as const,
  abAngle: (25 * Math.PI) / 180,
  pillAngle: PILL_ANGLE,
  select: [-11.7, -48.3] as const,
  start: [2.95, -48.3] as const,
};
