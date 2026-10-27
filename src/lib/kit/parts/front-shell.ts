import {
  type BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { printDecal } from "@/lib/three/canvas-texture";
import { box, cylZ, extrude, merge, subtract } from "@/lib/three/csg";
import { crossShape, pillShape, roundedRectShape } from "@/lib/three/shapes";
import { LCD_PLACEMENT, LCD_SCREW_HOLES } from "./lcd-board";
import {
  bodySolid,
  loftSolid,
  stadiumRing,
  sweepGroove,
  ZF,
} from "./shell-common";

/*
 * Nintendo 18405 front housing, built from a caliper-measured CAD of an
 * original DMG cross-checked against a 600 dpi scan. Device frame throughout.
 */

export const SHELL_COLOR = "#c4bfbc";
const INK = "#3e3884";
const DRAFT = 0.0768; // 4.4° wall draft
const FLOOR = 13.725; // inside face of the 2.4 mm front plate

/** Bottom-right speaker bevel: 0.1676x − 0.2904y + 0.9421z = 37.935. */
const BEVEL_N = new Vector3(0.1676, -0.2904, 0.9421);
const BEVEL_D = 37.935;

/** A slab occupying everything on the +normal side of the bevel plane (offset by `off`). */
function bevelHalfSpace(off = 0) {
  const g = box(400, 400, 60, 0, 0, 30);
  const q = new Matrix4().lookAt(
    new Vector3(),
    BEVEL_N.clone().negate(),
    new Vector3(0, 1, 0),
  );
  g.applyMatrix4(q);
  g.translate(
    ...(BEVEL_N.clone()
      .multiplyScalar(BEVEL_D + off)
      .toArray() as [number, number, number]),
  );
  return g;
}

/** Shears a geometry so z = 0 lands on the bevel plane (vertical offsets kept). */
function onBevel(g: BufferGeometry) {
  const { x: nx, y: ny, z: nz } = BEVEL_N;
  const m = new Matrix4().set(
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    -nx / nz,
    -ny / nz,
    1,
    BEVEL_D / nz,
    0,
    0,
    0,
    1,
  );
  g.applyMatrix4(m);
  return g;
}

/** Profile of the outer surface in a cross-section: wall → R3 fillet → face. */
function wrapPath(
  edgeAt: (z: number) => number,
  edge: number,
  faceCenterOffset: number,
) {
  // Returns [u, z] points from the parting plane up the wall, round the fillet,
  // onto the face, where u is the outward coordinate (x or y) on one side.
  const pts: [number, number, number, number][] = []; // u, z, nu, nz
  const wallTopZ = ZF.front - 3;
  for (let z = ZF.seam - 0.6; z <= wallTopZ; z += 1.25) {
    const u = edgeAt(z);
    pts.push([u, z, 1, DRAFT]);
  }
  const cu = edge - 3.778;
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push([
      cu + Math.cos(a) * 3,
      wallTopZ + Math.sin(a) * 3,
      Math.cos(a),
      Math.sin(a),
    ]);
  }
  for (let u = cu - 1; u > faceCenterOffset + 0.5; u -= 4)
    pts.push([u, ZF.front, 0, 1]);
  pts.push([faceCenterOffset, ZF.front, 0, 1]);
  return pts;
}

function buildShellBody() {
  const edge = { left: 3, right: 3, top: 3, bottom: 3 };
  let outer: BufferGeometry = bodySolid(ZF.front, ZF.seam, edge, 0, 10, DRAFT);
  // Cavity: inner faces 2.4 in, drafted, with the bevel followed underneath.
  let cavity: BufferGeometry = bodySolid(
    FLOOR,
    ZF.seam - 2,
    { left: 1, right: 1, top: 1, bottom: 1 },
    -2.4,
    3,
    DRAFT,
  );
  // Keep a 0.6 mm backing frame behind the lens recess.
  cavity = subtract(
    cavity,
    extrude(
      roundedRectShape(75.2, 57.0, { tl: 3, tr: 3, bl: 3, br: 12 }, 0, 32.7),
      0.6,
      FLOOR - 0.6,
    ),
    bevelHalfSpace(-2.4),
  );
  outer = subtract(outer, cavity);
  // Rim rebate: inner face steps out 1.0 for the bottom 1.6 mm (back-shell lip).
  outer = subtract(
    outer,
    bodySolid(
      4.7,
      ZF.seam - 2,
      { left: 0.01, right: 0.01, top: 0.01, bottom: 0.01 },
      -1.45,
      1,
      0,
    ),
  );
  outer = subtract(outer, bevelHalfSpace(0));

  // Lens recess, screen opening, LED hole.
  outer = subtract(
    outer,
    extrude(
      roundedRectShape(75.2, 57.0, { tl: 3, tr: 3, bl: 3, br: 12 }, 0, 32.7),
      3,
      ZF.front - 1.0,
    ),
    extrude(roundedRectShape(49.7, 45.5, 1.0, 0, 32.85), 8, 11),
    cylZ(1.6, 8, -31.8, 39.55, 14, 24),
  );

  // D-pad dish + cross opening.
  const dpad = [-26.0, -26.5] as const;
  const dishProfile: [number, number][] = [
    [0.4, 0.9],
    [6.0, 0.83],
    [7.0, 0.75],
    [8.0, 0.67],
    [9.0, 0.56],
    [10.0, 0.44],
    [11.0, 0.32],
    [12.0, 0.2],
    [12.5, 0.14],
    [13.0, 0.064],
    [13.5, 0.006],
    [13.75, 0],
  ];
  const dish = loftSolid([
    ...dishProfile.map(([r, d]) => ({
      z: ZF.front - d,
      pts: stadiumRing(dpad[0], dpad[1], 0, r, 0, 36),
    })),
    { z: ZF.front + 2, pts: stadiumRing(dpad[0], dpad[1], 0, 14.5, 0, 36) },
  ]);
  // A/B stadium dish around the B→A spine.
  const A = [32.125, -21.863] as const;
  const B = [17.624, -28.625] as const;
  const abMid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] as const;
  const abAng = Math.atan2(A[1] - B[1], A[0] - B[0]);
  const abLen = Math.hypot(A[0] - B[0], A[1] - B[1]);
  const abProfile: [number, number][] = [
    [1.0, 1.0],
    [2.0, 0.974],
    [3.0, 0.904],
    [4.0, 0.789],
    [5.0, 0.628],
    [5.5, 0.53],
    [6.0, 0.419],
    [6.5, 0.295],
    [7.0, 0.163],
    [7.5, 0.037],
    [7.9, 0],
  ];
  const abDish = loftSolid([
    ...abProfile.map(([rho, d]) => ({
      z: ZF.front - d,
      pts: stadiumRing(abMid[0], abMid[1], abLen, rho, abAng, 16),
    })),
    {
      z: ZF.front + 2,
      pts: stadiumRing(abMid[0], abMid[1], abLen, 8.6, abAng, 16),
    },
  ]);
  outer = subtract(outer, dish, abDish);
  outer = subtract(
    outer,
    extrude(crossShape(22.0, 8.0, 0.5, 0.2, dpad[0], dpad[1]), 8, 11),
    cylZ(5.375, 8, A[0], A[1], 14, 48),
    cylZ(5.375, 8, B[0], B[1], 14, 48),
  );

  // Select / Start: 11.5 × 3.5 stadiums at 25° with a 30° countersink.
  const ssAng = (25 * Math.PI) / 180;
  for (const [cx, cy] of [
    [-12.0, -47.86],
    [3.0, -47.86],
  ]) {
    outer = subtract(
      outer,
      loftSolid([
        { z: ZF.front - 0.71, pts: stadiumRing(cx, cy, 8.0, 1.75, ssAng, 14) },
        { z: ZF.front, pts: stadiumRing(cx, cy, 8.0, 2.97, ssAng, 14) },
        { z: ZF.front + 2, pts: stadiumRing(cx, cy, 8.0, 3.3, ssAng, 14) },
      ]),
      extrude(pillShape(11.5, 3.5, ssAng, cx, cy), 8, 10),
    );
  }

  // Speaker grille: six 2.0 × 14.1 grooves, 1.6 deep, at −60°, 5.0 pitch.
  const axis = new Vector2(0.5, -0.866);
  const row = new Vector2(0.866, 0.5);
  const flat: BufferGeometry[] = [];
  const bev: BufferGeometry[] = [];
  const slits: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const up = new Vector2(12.0, -59.0).addScaledVector(row, i * 5.0);
    const mid = up.clone().addScaledVector(axis, 12.1 / 2);
    const ang = Math.atan2(axis.y, axis.x);
    flat.push(
      extrude(pillShape(14.1, 2.0, ang, mid.x, mid.y), 4, ZF.front - 1.6),
    );
    bev.push(
      onBevel(extrude(pillShape(14.1, 2.0, ang, mid.x, mid.y), 5, -1.6)),
    );
    if (i > 0) {
      const sMid = up
        .clone()
        .addScaledVector(axis, (-0.65 + 10.3) / 2)
        .addScaledVector(row, -0.675);
      slits.push(extrude(pillShape(10.95, 0.65, ang, sMid.x, sMid.y), 10, 8));
    }
  }
  outer = subtract(outer, merge(flat));
  outer = subtract(outer, merge(bev));
  outer = subtract(outer, merge(slits));

  // Top band: a 2.0 × 0.5 groove at y 65.75 wrapping round both sides, and
  // two 1.5 mm grooves at x ±37.15 running up and over the top edge.
  const wallX = (z: number) => 45 - DRAFT * (z - ZF.seam);
  const side = wrapPath(wallX, 45, 0);
  const hp: Vector3[] = [];
  const hn: Vector3[] = [];
  for (const [u, z, nu, nz] of side) {
    hp.push(new Vector3(-u, 65.75, z));
    hn.push(new Vector3(-nu, 0, nz).normalize());
  }
  for (const [u, z, nu, nz] of [...side].reverse()) {
    hp.push(new Vector3(u, 65.75, z));
    hn.push(new Vector3(nu, 0, nz).normalize());
  }
  const grooves = [sweepGroove(hp, hn, new Vector3(0, 1, 0), 2.0, 0.5)];
  const wallY = (z: number) => 74 - DRAFT * (z - ZF.seam);
  for (const x of [-37.15, 37.15]) {
    const vp: Vector3[] = [];
    const vn: Vector3[] = [];
    const top = wrapPath(wallY, 74, 66.75).reverse();
    for (const [u, z, nu, nz] of top) {
      vp.push(new Vector3(x, u, z));
      vn.push(new Vector3(0, nu, nz).normalize());
    }
    grooves.push(sweepGroove(vp, vn, new Vector3(1, 0, 0), 1.5, 0.5));
  }
  outer = subtract(outer, grooves[0]);
  outer = subtract(outer, merge(grooves.slice(1)));

  // Left side: recessed label panels with windows for the contrast wheel and DC plug.
  outer = subtract(
    outer,
    box(4, 17.2, 7.9, -45.84, 28.6, 6.95),
    box(4, 12.0, 7.9, -45.84, 48.0, 6.95),
    box(8, 12.6, 4.6, -43, 28.7, 4.3),
    box(8, 8.9, 4.6, -43, 47.95, 4.3),
  );
  // Bottom: headphone arch (R3.5) open to the parting plane.
  const arch = new Shape();
  arch.moveTo(-5.5, ZF.seam - 2);
  arch.lineTo(1.5, ZF.seam - 2);
  arch.lineTo(1.5, 7.375);
  arch.absarc(-2.0, 7.375, 3.5, 0, Math.PI, false);
  arch.closePath();
  const archG = extrude(arch, 8, 0);
  archG.rotateX(Math.PI / 2);
  archG.translate(0, -69, 0);
  outer = subtract(outer, archG);
  return outer;
}

/* ------------------------------ internals ------------------------------ */

const ring = (
  od: number,
  id: number,
  z0: number,
  z1: number,
  x: number,
  y: number,
  seg = 32,
) => {
  const s = new Shape();
  s.absarc(x, y, od / 2, 0, Math.PI * 2, false);
  const h = new Path();
  h.absarc(x, y, id / 2, 0, Math.PI * 2, true);
  s.holes.push(h);
  return extrude(s, z1 - z0, z0, 0, 1, seg);
};

function buildInternals() {
  const parts: BufferGeometry[] = [];
  // Tri-wing receivers (top pair clamps the CPU board; middle pair passes its notches).
  for (const x of [-37.47, 37.47]) {
    parts.push(ring(5.0, 2.0, 3.0, FLOOR, x, 56.22));
    parts.push(ring(5.0, 2.0, 4.6, FLOOR, x, 6.21));
    parts.push(ring(3.6, 2.0, 1.625, 4.6, x, 6.21));
  }
  parts.push(ring(4.0, 2.0, 5.725, FLOOR, 27.0, -36.75));
  parts.push(ring(4.0, 2.0, 5.725, FLOOR, -27.0, -48.0));
  // Ten LCD-board posts (Ø4, pilot Ø1.6, tips at the board's front face).
  for (const [x, y] of LCD_SCREW_HOLES) {
    parts.push(
      ring(
        4.0,
        1.6,
        LCD_PLACEMENT.z,
        FLOOR,
        x + LCD_PLACEMENT.x,
        y + LCD_PLACEMENT.y,
        24,
      ),
    );
  }
  // Locating pins for the three rubber contacts.
  for (const [x, y] of [
    [-36.5, -16.25],
    [-15.5, -37.5],
    [10.774, -25.125],
    [39.475, -25.363],
    [-2.5, -44.5],
  ]) {
    parts.push(cylZ(0.9, FLOOR - 6.025, x, y, (FLOOR + 6.025) / 2, 16, 0.95));
  }
  // D-pad guide ring.
  parts.push(ring(30.05, 27.25, 9.075, FLOOR, -26.0, -26.5, 64));
  // A/B guide sleeves with slots for the button tabs.
  for (const [x, y] of [
    [17.624, -28.625],
    [32.125, -21.863],
  ]) {
    parts.push(
      subtract(
        ring(12.25, 10.75, 8.975, FLOOR, x, y, 40),
        box(14, 3.4, 5.06, x, y, 10.5),
      ),
    );
  }
  // Start/Select stadium sleeves.
  const ssAng = (25 * Math.PI) / 180;
  for (const [cx, cy] of [
    [-12.0, -47.86],
    [3.0, -47.86],
  ]) {
    const s = pillShape(8.0 + 7.4, 7.4, ssAng, cx, cy);
    const h = new Path(stadiumRing(cx, cy, 8.0, 2.5, ssAng, 12).reverse());
    s.holes.push(h);
    parts.push(extrude(s, FLOOR - 8.725, 8.725, 0, 1, 12));
  }
  // Speaker retaining ring (Ø29.25/32.05) — open sector 145–180°, trimmed by the bevel.
  {
    const c = [24.625, -53.625] as const;
    const annulus = (a0: number, a1: number) => {
      const s = new Shape();
      s.absarc(c[0], c[1], 32.05 / 2, a0, a1, false);
      s.absarc(c[0], c[1], 29.25 / 2, a1, a0, true);
      return s;
    };
    const d2r = Math.PI / 180;
    let sp = merge([
      extrude(annulus(-180 * d2r, 145 * d2r), FLOOR - 7.975, 7.975, 0, 1, 64),
      extrude(annulus(145 * d2r, 180 * d2r), FLOOR - 8.725, 8.725, 0, 1, 16),
    ]);
    sp = subtract(
      sp,
      bevelHalfSpace(-2.4),
      box(
        1.5,
        4,
        3,
        c[0] + Math.cos(30 * d2r) * 15.3,
        c[1] + Math.sin(30 * d2r) * 15.3,
        8.5,
        30 * d2r,
      ),
    );
    parts.push(sp);
  }
  // LED light tube.
  parts.push(ring(5.5, 3.2, FLOOR - 3, FLOOR, -31.8, 39.55, 24));
  // Ribs behind the power-switch slot.
  for (const [x, t] of [
    [-35.25, 0.75],
    [-30.0, 1.25],
    [-25.0, 1.25],
  ]) {
    parts.push(box(t, 2.9, FLOOR - 3.225, x, 69.95, (FLOOR + 3.225) / 2));
  }
  // Right-side label tabs hanging over the back-shell openings.
  parts.push(box(0.84, 10.9, 1.6, 42.89, 24.05, 2.325));
  parts.push(box(0.84, 11.9, 1.6, 42.89, 45.15, 2.325));
  return merge(parts);
}

/* -------------------------------- prints -------------------------------- */

/** Fits `text` between x0..x1 with a given cap height (mm), optional italic skew. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x0: number,
  x1: number,
  baseline: number,
  cap: number,
  font: string,
  skewDeg = 0,
  capRatio = 0.72,
) {
  ctx.save();
  const size = cap / capRatio;
  ctx.font = `${font.replace("SIZE", `${size}px`)}`;
  const w = ctx.measureText(text).width;
  ctx.translate(x0, baseline);
  // y is up in face decals, so +tan leans the tops to the right (italic).
  ctx.transform(1, 0, Math.tan((skewDeg * Math.PI) / 180), 1, 0, 0);
  ctx.scale((x1 - x0) / w, 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A decal on the front face covering device rect [x0,x1]×[y0,y1]; draw in device coords. */
function faceDecal(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  z = ZF.front + 0.03,
) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = printDecal(
    w,
    h,
    (ctx) => {
      // Canvas mm with y down → device coords (y up).
      ctx.translate(-x0, y1);
      ctx.scale(1, -1);
      const flipText = ctx.fillText.bind(ctx);
      ctx.fillText = (t: string, x: number, y: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, -1);
        flipText(t, 0, 0);
        ctx.restore();
      };
      draw(ctx);
    },
    { dpmm: 28 },
  );
  d.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  return d;
}

/** Moulded (same-colour) lettering: a soft highlight and shadow fake the relief. */
function emboss(
  ctx: CanvasRenderingContext2D,
  paint: (ctx: CanvasRenderingContext2D) => void,
) {
  ctx.save();
  ctx.translate(-0.07, 0.07);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  paint(ctx);
  ctx.restore();
  ctx.save();
  ctx.translate(0.07, -0.07);
  ctx.fillStyle = "rgba(70,60,55,0.35)";
  ctx.strokeStyle = "rgba(70,60,55,0.35)";
  paint(ctx);
  ctx.restore();
}

function buildPrints() {
  const g = new Group();
  // Logo: "Nintendo" wordmark + oblique "GAME BOY" + ™.
  g.add(
    faceDecal(-39, 14, -3.5, 3.5, (ctx) => {
      ctx.fillStyle = INK;
      fitText(
        ctx,
        "Nintendo",
        -37.9,
        -18.25,
        -2.3,
        2.85,
        '700 SIZE "Arial Rounded MT Bold", "Nunito", Arial, sans-serif',
      );
      fitText(
        ctx,
        "GAME BOY",
        -17.35,
        9.6,
        -2.34,
        4.67,
        '700 SIZE Futura, "Century Gothic", "Avenir Next", Arial, sans-serif',
        12,
      );
      fitText(
        ctx,
        "TM",
        10.1,
        12.9,
        -0.95,
        1.1,
        "700 SIZE Futura, Arial, sans-serif",
      );
    }),
  );
  // Button legends.
  g.add(
    faceDecal(16, 40, -40, -27, (ctx) => {
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      fitText(
        ctx,
        "B",
        21.88 - 1.35,
        21.88 + 1.35,
        -37.2 - 1.25,
        2.5,
        '800 SIZE "Arial Rounded MT Bold", Futura, Arial',
      );
      fitText(
        ctx,
        "A",
        36.44 - 1.4,
        36.44 + 1.4,
        -30.28 - 1.25,
        2.5,
        '800 SIZE "Arial Rounded MT Bold", Futura, Arial',
      );
    }),
  );
  g.add(
    faceDecal(-18, 12, -56, -47, (ctx) => {
      ctx.fillStyle = INK;
      for (const [label, cx, cy, len] of [
        ["SELECT", -10.62, -51.68, 12.4],
        ["START", 4.29, -51.48, 11.0],
      ] as [string, number, number, number][]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((27 * Math.PI) / 180);
        fitText(
          ctx,
          label,
          -len / 2,
          len / 2,
          -0.85,
          1.7,
          '800 SIZE Futura, "Avenir Next", Arial',
          6,
        );
        ctx.restore();
      }
    }),
  );
  // PHONES plate (raised stadium outline, headphone glyph, moulded text).
  g.add(
    faceDecal(-12.5, 3.5, -71, -66.3, (ctx) => {
      emboss(ctx, (c) => {
        c.lineWidth = 0.35;
        c.beginPath();
        c.roundRect(-11.7, -70.3, 14.1, 3.3, 1.6);
        c.stroke();
        fitText(c, "PHONES", -8.2, 1.4, -69.35, 1.4, "700 SIZE Futura, Arial");
        c.lineWidth = 0.28;
        c.beginPath();
        c.arc(-9.6, -68.75, 0.75, Math.PI, 0, true);
        c.stroke();
        c.fillRect(-10.45, -69.5, 0.4, 0.8);
        c.fillRect(-9.15, -69.5, 0.4, 0.8);
      });
    }),
  );
  // ◁OFF•ON▷ plate on the top band.
  g.add(
    faceDecal(-35, -16.5, 66.8, 71.8, (ctx) => {
      emboss(ctx, (c) => {
        c.lineWidth = 0.35;
        c.beginPath();
        c.roundRect(-34.2, 67.4, 17.0, 3.9, 1.95);
        c.stroke();
        fitText(
          c,
          "◁OFF•ON▷",
          -33.0,
          -18.4,
          68.4,
          1.9,
          '600 SIZE Futura, "Avenir Next", Arial',
        );
      });
    }),
  );
  // D-pad arrows: four tiny raised triangles at r 12.4 on the dish rim.
  const arrows: BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const s = new Shape();
    s.moveTo(1.1, 0);
    s.lineTo(0, 0.7);
    s.lineTo(0, -0.7);
    s.closePath();
    const t = extrude(s, 0.15 + 0.2, 0);
    t.translate(-0.55, 0, 0);
    t.rotateZ(a);
    t.translate(
      -26 + Math.cos(a) * 12.4,
      -26.5 + Math.sin(a) * 12.4,
      ZF.front - 0.18 - 0.2 + 0.15,
    );
    arrows.push(t);
  }
  const arrowMesh = new Mesh(
    merge(arrows),
    new MeshStandardMaterial({ color: SHELL_COLOR, roughness: 0.6 }),
  );
  g.add(arrowMesh);
  return g;
}

function sideLabels() {
  const g = new Group();
  const label = (text: string, w: number, h: number) =>
    printDecal(w, h, (ctx) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 1.6px Futura, Arial";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(text, w / 2 - 0.06, h / 2 - 0.06);
      ctx.fillStyle = "rgba(70,60,55,0.4)";
      ctx.fillText(text, w / 2 + 0.06, h / 2 + 0.06);
    });
  // Right side (+X): VOL and EXT. CONNECTOR plates read along +Y.
  const right = [
    ["◁VOL", 23.3, 10],
    ["EXT.CONNECTOR", 46.0, 18],
  ] as [string, number, number][];
  for (const [t, y, w] of right) {
    const d = label(t, w, 2.6);
    d.rotation.set(0, Math.PI / 2, Math.PI / 2);
    d.position.set(44.63, y, 8.6);
    g.add(d);
  }
  const left = [
    ["CONTRAST", 28.6, 14],
    ["DC IN 6V", 48.0, 11],
  ] as [string, number, number][];
  for (const [t, y, w] of left) {
    const d = label(t, w, 2.4);
    d.rotation.set(0, -Math.PI / 2, -Math.PI / 2);
    d.position.set(-43.87, y, 7.0);
    g.add(d);
  }
  return g;
}

export function buildFrontShell() {
  const mat = new MeshStandardMaterial({
    color: SHELL_COLOR,
    roughness: 0.58,
    metalness: 0,
  });
  const g = new Group();
  g.add(new Mesh(buildShellBody(), mat));
  g.add(new Mesh(buildInternals(), mat));
  g.add(buildPrints());
  g.add(sideLabels());
  return g;
}
