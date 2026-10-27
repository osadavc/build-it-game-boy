import {
  type BufferGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  Vector3,
} from "three";
import { printDecal } from "@/lib/three/canvas-texture";
import { box, cylZ, extrude, merge, subtract, union } from "@/lib/three/csg";
import { polygonShape, roundedRectShape } from "@/lib/three/shapes";
import { CELL_Z, CPU_PLACEMENT } from "./cpu-board";
import { SHELL_COLOR } from "./front-shell";
import { BODY, bodySolid, sweepGroove, ZF } from "./shell-common";

/*
 * Nintendo 18406 rear housing. Photogrammetry of museum/studio photos plus
 * the measured CAD Z frame. Device frame throughout; back plane at −16.125.
 */

const WALL = 1.8;
const BACK_EDGE = { left: 8, right: 8, top: 3, bottom: 6.5 };
/** The screw rails and the lugs beside the cartridge bay sit 1.5 mm proud of the back. */
const RAIL_Z = ZF.back + 1.5;
/** Inside face of the battery-bay floor (the side the cells rest on). */
export const BAY_FLOOR_Z = 2.0;
const BAY = { x0: -29.0, x1: 29.0, y0: -67.53, y1: -12.03 };
/** Seat depth of the four back screws (head bearing face). */
export const BACK_SCREW_SEAT_Z = -2.2;
export const CASE_SCREWS_BACK: [number, number][] = [
  [37.47, 56.22],
  [-37.47, 56.22],
  [37.47, 6.21],
  [-37.47, 6.21],
];
export const CASE_SCREWS_BAY: [number, number][] = [
  [27.0, -36.75],
  [-27.0, -48.0],
];
export const BAY_SCREW_SEAT_Z = BAY_FLOOR_Z + 0.6;
export const GUARD_SCREWS: [number, number][] = [
  [-32.6, 39.5],
  [-32.6, 20.5],
  [31.6, 33.9],
  [31.6, 19.5],
];
/** Underside of the mirror-steel guard plate = the cartridge bay floor. */
export const GUARD_Z = -7.2;

function outlineShape(inset = 0) {
  const r = BODY.r;
  return roundedRectShape(BODY.w - inset * 2, BODY.h - inset * 2, {
    tl: Math.max(r.tl - inset, 0.3),
    tr: Math.max(r.tr - inset, 0.3),
    bl: Math.max(r.bl - inset, 0.3),
    br: Math.max(r.br - inset, 0.3),
  });
}

const tube = (
  od: number,
  id: number,
  z0: number,
  z1: number,
  x: number,
  y: number,
  seg = 28,
) => {
  const s = new Shape();
  s.absarc(x, y, od / 2, 0, Math.PI * 2, false);
  const h = new Path();
  h.absarc(x, y, id / 2, 0, Math.PI * 2, true);
  s.holes.push(h);
  return extrude(s, z1 - z0, z0, 0, 1, seg);
};

function buildBody() {
  let g: BufferGeometry = bodySolid(ZF.back, ZF.seam, BACK_EDGE, 0, 12);
  const cavity = bodySolid(
    ZF.back + WALL,
    ZF.seam + 2,
    {
      left: BACK_EDGE.left - WALL,
      right: BACK_EDGE.right - WALL,
      top: 1.2,
      bottom: BACK_EDGE.bottom - WALL,
    },
    -WALL,
    6,
  );
  g = subtract(g, cavity);

  // Battery box: walls + floor partition added inside, then hollowed.
  g = union(
    g,
    box(
      BAY.x1 - BAY.x0 + 2.4,
      BAY.y1 - BAY.y0 + 2.4,
      BAY_FLOOR_Z + 1.2 - (ZF.back + 1),
      0,
      (BAY.y0 + BAY.y1) / 2,
      (BAY_FLOOR_Z + 1.2 + ZF.back + 1) / 2,
    ),
  );

  // Parting-line reveal: outer face stepped in 0.7 for z 2.2–3.1.
  const reveal = outlineShape(0);
  reveal.holes.push(new Path(outlineShape(0.7).getPoints(24)));
  const rails = (sx: 1 | -1) =>
    extrude(
      polygonShape(
        [
          [sx * 33.8, 2.0],
          [sx * 47, 2.0],
          [sx * 47, 76],
          [sx * 29.4, 76],
          [sx * 29.4, 42.2],
          [sx * 33.8, 42.2],
        ].map(([x, y]) => [x, y] as [number, number]),
        [0, 0, 0, 0, 1.5, 1.5],
      ),
      RAIL_Z - (ZF.back - 2),
      ZF.back - 2,
    );
  g = subtract(
    g,
    extrude(reveal, 1.2, 2.2),
    merge([rails(1), rails(-1)]),
    // Cartridge U-notch, open to the back, down to the bay floor.
    box(
      58.8,
      34,
      GUARD_Z - (ZF.back - 2),
      0,
      59.2,
      (GUARD_Z + ZF.back - 2) / 2,
    ),
  );

  // Battery bay interior, cover recess and latch notch.
  g = subtract(
    g,
    box(
      BAY.x1 - BAY.x0,
      BAY.y1 - BAY.y0,
      BAY_FLOOR_Z - (ZF.back - 2),
      0,
      (BAY.y0 + BAY.y1) / 2,
      (BAY_FLOOR_Z + ZF.back - 2) / 2,
    ),
    extrude(
      roundedRectShape(61.6, 57.8, 1.0, 0, (-69.5 - 11.7) / 2),
      1.6 + 2,
      ZF.back - 2,
    ),
    extrude(
      roundedRectShape(
        16.2,
        11.5,
        { tl: 1.1, tr: 1.1, bl: 0, br: 0 },
        0,
        (-11.3 + 0.2) / 2,
      ),
      1.6 + 2,
      ZF.back - 2,
    ),
  );
  // Terminal holes for the CPU-board contacts, cover hinge slots.
  g = subtract(
    g,
    box(9.0, 5.5, 3, -22.22, -14.78, BAY_FLOOR_Z + 0.6),
    box(8.75, 9.75, 3, 22.4, -16.9, BAY_FLOOR_Z + 0.6),
    box(8.5, 1.4, 3, 21.25, -69.1, ZF.back + 2.4),
    box(8.7, 1.4, 3, -21.45, -69.1, ZF.back + 2.4),
  );

  // Battery-bay screw holes through the floor, with 0.6 mm head counterbores.
  g = subtract(
    g,
    ...CASE_SCREWS_BAY.flatMap(([x, y]) => [
      cylZ(1.1, 6, x, y, BAY_FLOOR_Z + 1, 20),
      cylZ(2.2, 1.2, x, y, BAY_FLOOR_Z, 24),
    ]),
  );

  // Power-switch window in the top wall, side openings.
  g = subtract(
    g,
    box(10.6, 6, ZF.seam + 2 - -2.825, -30.3, 73.5, (ZF.seam + 2 + -2.825) / 2),
    // +X: link port and volume notches, open to the parting line.
    extrude(roundedRectShape(ZF.seam + 2 - -6.525, 13.0, 1.0, 0, 0), 8, 0)
      .rotateY(Math.PI / 2)
      .translate(41, 45.0, (ZF.seam + 2 + -6.525) / 2),
    extrude(roundedRectShape(ZF.seam + 2 - -3.525, 12.0, 1.0, 0, 0), 8, 0)
      .rotateY(Math.PI / 2)
      .translate(41, 24.0, (ZF.seam + 2 + -3.525) / 2),
    // −X: DC IN jack hole Ø4.4 and the shallow rating panel.
    cylZ(2.2, 10, 0, 0, 0, 28)
      .rotateY(Math.PI / 2)
      .translate(-44, 48.3, -3.1),
    box(1.0, 25.0, 3.9, -45.2, 25.1, 0.35),
  );

  // Back face: serial-sticker recess, moulded rating panel, screw counterbores.
  const bores: BufferGeometry[] = [];
  for (const [x, y] of CASE_SCREWS_BACK) {
    bores.push(
      cylZ(
        2.7,
        BACK_SCREW_SEAT_Z - (ZF.back - 1),
        x,
        y,
        (BACK_SCREW_SEAT_Z + ZF.back - 1) / 2,
        32,
      ),
    );
    bores.push(cylZ(2.9, 0.6, x, y, RAIL_Z, 32, 2.7));
  }
  g = subtract(
    g,
    extrude(roundedRectShape(25.4, 4.9, 0.5, 0, 27.8), 0.3 + 1, ZF.back - 1),
    extrude(roundedRectShape(42.9, 19.1, 0.6, 0, 12.25), 0.2 + 1, ZF.back - 1),
    merge(bores),
  );

  // Grip grooves: 13 per side wrapping round the R8 side fillet, 3 inner.
  const grooves: BufferGeometry[] = [];
  const railY = [
    -0.4, -4.37, -8.34, -12.31, -16.28, -20.25, -24.22, -28.19, -32.16, -36.13,
    -40.1, -44.07, -48.04,
  ];
  const R = BACK_EDGE.left;
  for (const sx of [1, -1]) {
    for (const y of railY) {
      const pts: Vector3[] = [];
      const ns: Vector3[] = [];
      pts.push(new Vector3(sx * 33.7, y, ZF.back));
      ns.push(new Vector3(0, 0, -1));
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
        pts.push(
          new Vector3(
            sx * (45 - R + Math.cos(a) * R),
            y,
            ZF.back + R + Math.sin(a) * R,
          ),
        );
        ns.push(new Vector3(sx * Math.cos(a), 0, Math.sin(a)));
      }
      pts.push(new Vector3(sx * 45, y, -5.5));
      ns.push(new Vector3(sx, 0, 0));
      grooves.push(sweepGroove(pts, ns, new Vector3(0, 1, 0), 1.2, 0.6));
    }
  }
  const inner: BufferGeometry[] = [];
  for (const y of [-1.35, -5.35, -9.35]) {
    for (const sx of [1, -1]) {
      const g2 = cylZ(0.6, 33.7 - 8.1, 0, 0, 0, 12).rotateY(Math.PI / 2);
      g2.translate((sx * (33.7 + 8.1)) / 2, y, ZF.back);
      inner.push(g2);
    }
  }
  g = subtract(g, merge(grooves));
  g = subtract(g, merge(inner));
  return g;
}

function buildInternals() {
  const parts: BufferGeometry[] = [];
  const inside = ZF.back + WALL;
  // Back screw bosses: counterbored tubes that clamp the CPU board.
  for (const [x, y] of CASE_SCREWS_BACK) {
    const top = y > 30 ? CPU_PLACEMENT.z - 1.2 : 1.5;
    parts.push(tube(7.4, 5.4, inside, BACK_SCREW_SEAT_Z, x, y));
    parts.push(tube(7.4, 2.2, BACK_SCREW_SEAT_Z, top, x, y));
  }
  // Battery-bay screw bosses rising from the partition (front receivers nest inside).
  for (const [x, y] of CASE_SCREWS_BAY)
    parts.push(tube(6.0, 4.5, BAY_FLOOR_Z + 1.2, 6.125, x, y));
  // CPU-board screw bosses (under the cartridge-connector flanges).
  for (const [x, y] of [
    [30.2 + CPU_PLACEMENT.x, -30.0 + CPU_PLACEMENT.y],
    [-31.5 + CPU_PLACEMENT.x, -30.0 + CPU_PLACEMENT.y],
  ]) {
    parts.push(tube(5.0, 2.0, inside, CPU_PLACEMENT.z - 1.2 - 2.0, x, y));
  }
  // Guard-plate bosses.
  for (const [x, y] of GUARD_SCREWS)
    parts.push(tube(5.0, 1.8, inside, GUARD_Z, x, y));
  // Cartridge guide walls either side of the bay.
  for (const sx of [1, -1])
    parts.push(
      box(1.2, 69, GUARD_Z - inside, sx * 30.0, 39.5, (GUARD_Z + inside) / 2),
    );
  // Battery-bay dividers (1.2 thick, 6 tall) between the four channels.
  for (const x of [-14.5, 0, 14.5])
    parts.push(
      box(
        1.2,
        BAY.y1 - BAY.y0 - 1,
        6.0,
        x,
        (BAY.y0 + BAY.y1) / 2,
        BAY_FLOOR_Z - 3.0,
      ),
    );
  // Jack-board standoffs on top of the partition.
  for (const [x, y] of [
    [-8.5, -63.3],
    [8.2, -63.3],
  ]) {
    parts.push(tube(4.6, 1.8, BAY_FLOOR_Z + 1.2, BAY_FLOOR_Z + 1.4, x, y, 20));
  }
  return merge(parts);
}

/** Moulded or printed artwork on the back, drawn in back-view coordinates (x mirrored). */
function backDecal(
  cx: number,
  cy: number,
  w: number,
  h: number,
  z: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const d = printDecal(w, h, draw, { dpmm: 26 });
  d.rotation.y = Math.PI;
  d.position.set(cx, cy, z - 0.04);
  return d;
}

function emboss(ctx: CanvasRenderingContext2D, paint: () => void) {
  ctx.save();
  ctx.translate(-0.06, -0.06);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  paint();
  ctx.restore();
  ctx.save();
  ctx.translate(0.06, 0.06);
  ctx.fillStyle = "rgba(80,70,65,0.38)";
  paint();
  ctx.restore();
}

function buildPrints() {
  const g = new Group();
  // Rating text moulded into the recessed panel (reads normally from behind).
  g.add(
    backDecal(0, 12.25, 42.9, 19.1, ZF.back + 0.2, (ctx) => {
      const lines: [number, number, string][] = [
        [19.8, 1.45, "MODEL NO.  DMG-01"],
        [17.3, 1.45, "© 1989 Nintendo"],
        [14.55, 1.45, "RATING : DC6V 0.7W"],
        [12.0, 1.45, "BATTERY : SUM-3(AA,R6)×4"],
        [9.5, 1.45, "PAT. PEND.  MADE IN JAPAN"],
        [6.6, 1.1, "Complies with the limits for a Class B computing"],
        [4.6, 1.1, "device pursuant to Subpart J of Part 15 of FCC Rules."],
      ];
      emboss(ctx, () => {
        ctx.textBaseline = "alphabetic";
        for (const [y, cap, text] of lines) {
          ctx.font = `600 ${cap / 0.72}px Futura, "Avenir Next", Arial`;
          // Panel top-left in back view is at device (x=+21.45, y=21.8).
          ctx.fillText(text, 21.45 - 20.55, 21.8 - y + cap * 0.5 + 0.5);
        }
        ctx.lineWidth = 0.18;
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.strokeRect(21.45 + 12.1, 21.8 - 13.8, 7.5, 4.55);
        ctx.font = "700 1.6px Futura, Arial";
        ctx.fillText("VCCI", 21.45 + 13.5, 21.8 - 11.0);
      });
    }),
  );
  // Serial-number sticker.
  g.add(
    backDecal(0, 27.8, 25.0, 4.6, ZF.back + 0.3, (ctx) => {
      ctx.fillStyle = "#d6d6d1";
      ctx.beginPath();
      ctx.roundRect(0, 0, 25, 4.6, 0.4);
      ctx.fill();
      ctx.fillStyle = "#2d3c96";
      ctx.font = '600 3.3px "OCR B", "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("G05023447", 12.5, 2.45);
    }),
  );
  // Polarity marks moulded into each cell channel floor.
  const bay = printDecal(BAY.x1 - BAY.x0, BAY.y1 - BAY.y0, (ctx) => {
    const W = BAY.x1 - BAY.x0;
    const H = BAY.y1 - BAY.y0;
    // Back-view canvas: u = −x, v = top-down.
    const toU = (x: number) => W / 2 - x;
    const toV = (y: number) => BAY.y1 - y;
    const channels: [number, boolean][] = [
      [-21.75, true],
      [-7.25, false],
      [7.25, true],
      [21.75, false],
    ];
    emboss(ctx, () => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const [x, plusTop] of channels) {
        const marks: [number, string][] = plusTop
          ? [
              [-29.4, "+"],
              [-46.6, "−"],
            ]
          : [
              [-27.1, "−"],
              [-44.5, "+"],
            ];
        for (const [y, sym] of marks) {
          ctx.beginPath();
          ctx.lineWidth = 0.25;
          ctx.strokeStyle = ctx.fillStyle as string;
          ctx.arc(toU(x), toV(y), 1.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "700 3px Arial";
          ctx.fillText(sym, toU(x), toV(y) + 0.1);
        }
        // Raised battery-silhouette outline around each channel's marks.
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.roundRect(toU(x) - 6, H / 2 + 1.5 - 22, 12, 44, 1.5);
        ctx.stroke();
      }
    });
  });
  bay.rotation.y = Math.PI;
  bay.position.set(0, (BAY.y0 + BAY.y1) / 2, BAY_FLOOR_Z - 0.04);
  g.add(bay);
  return g;
}

export function buildBackShell() {
  const mat = new MeshStandardMaterial({ color: SHELL_COLOR, roughness: 0.58 });
  const g = new Group();
  g.add(new Mesh(buildBody(), mat));
  g.add(new Mesh(buildInternals(), mat));
  g.add(buildPrints());
  return g;
}

export { CELL_Z };
