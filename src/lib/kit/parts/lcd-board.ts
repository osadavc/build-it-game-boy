import {
  type BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import { printDecal } from "@/lib/three/canvas-texture";
import { box, cylZ, extrude, merge, subtract } from "@/lib/three/csg";
import { roundedRectShape } from "@/lib/three/shapes";
import { ledMaterial, M } from "../materials";
import { screenMaterial } from "../screen";
import { sop } from "./electronics";
import {
  axial,
  boardText,
  buildBoard,
  ceramicDisc,
  lyingElectrolytic,
  solderJoints,
  thumbwheel,
} from "./pcb";
import { domeCap } from "./power";

/*
 * DMG-LCD-06 with its Sharp 160×144 STN module. Outline and holes registered
 * from original boards onto an open drop-in replacement's hole pattern
 * (±0.25 mm). Board-local frame: front view, origin at outline centre, LCD
 * side (front face) at z = 0, back face at z = −T.
 */
export const LCD_T = 1.0;
const T = LCD_T;
/** device = local + offset; front face Z from the measured button stack. */
export const LCD_PLACEMENT = { x: 0.3, y: 5.5, z: 7.475 };

const OUTLINE: [number, number][] = [
  [-40.52, 58.73],
  [40.53, 58.73],
  [40.53, 34.58],
  [33.53, 34.58],
  [33.53, 23.08],
  [40.53, 23.08],
  [40.53, -29.77],
  [39.47, -29.78],
  [39.19, -29.81],
  [38.92, -29.92],
  [38.7, -30.1],
  [38.52, -30.33],
  [38.41, -30.59],
  [38.38, -30.88],
  [38.41, -31.16],
  [38.52, -31.42],
  [38.7, -31.65],
  [38.92, -31.83],
  [39.19, -31.94],
  [39.47, -31.97],
  [40.53, -31.97],
  [40.53, -46.77],
  [23.81, -46.72],
  [23.1, -46.74],
  [22.38, -46.8],
  [21.67, -46.91],
  [20.97, -47.07],
  [20.28, -47.26],
  [19.6, -47.5],
  [18.93, -47.78],
  [18.29, -48.1],
  [17.67, -48.46],
  [17.07, -48.85],
  [16.49, -49.28],
  [15.94, -49.75],
  [15.43, -50.25],
  [14.94, -50.78],
  [14.49, -51.33],
  [14.07, -51.92],
  [13.69, -52.53],
  [13.34, -53.16],
  [13.04, -53.81],
  [12.78, -54.48],
  [12.55, -55.17],
  [12.37, -55.86],
  [12.24, -56.57],
  [12.14, -57.28],
  [11.97, -58.22],
  [11.47, -58.72],
  [-18.67, -58.72],
  [-20.17, -57.22],
  [-20.17, -50.27],
  [-23.17, -47.27],
  [-31.67, -47.27],
  [-40.52, -38.42],
  [-40.52, 39.28],
  [-32.97, 39.28],
  [-32.97, 45.28],
  [-40.52, 45.28],
];

/** The ten board screws (S0–S10), front-view local coordinates. */
export const LCD_SCREW_HOLES: [number, number][] = [
  [22.72, 55.08],
  [-12.88, 57.08],
  [35.93, 6.68],
  [-35.97, 6.68],
  [37.93, -16.42],
  [-37.97, -15.67],
  [16.08, -22.33],
  [-10.07, -22.33],
  [37.93, -39.27],
  [-10.57, -44.72],
];

/** Nintendo's decoy hole (Fig. 13): a screw here cracks the LCD. */
const DECOY: [number, number] = [-1.67, 34.51];

const HOLES = [
  ...LCD_SCREW_HOLES.map((pos) => ({ pos, d: 2.4 })),
  { pos: [-36.99, 50.62], d: 4.8 },
  { pos: [36.91, 50.62], d: 4.8 },
  { pos: [-36.99, 0.84], d: 4.8 },
  { pos: [36.91, 0.84], d: 4.8 },
  { pos: [26.75, -42.34], d: 4.6 },
  { pos: [-36.48, -21.27], d: 2.4 },
  { pos: [10.78, -30.08], d: 2.4 },
  { pos: [-15.41, -42.08], d: 2.4 },
  { pos: [-2.45, -49.45], d: 2.4 },
  { pos: [29.83, 6.98], d: 2.0 },
  { pos: [-17.07, -13.83], d: 1.7 },
  { pos: [16.93, -13.83], d: 1.7 },
  { pos: DECOY, d: 2.4 },
] as { pos: [number, number]; d: number }[];

const CARBON = "#1c1f1c";

function paintFront(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = CARBON;
  // D-pad: four split discs Ø5 (two D-halves, 0.5 mm radial gap).
  const dc: [number, number] = [-25.92, -31.88];
  for (const [dx, dy] of [
    [0, 9.6],
    [0, -9.6],
    [-9.6, 0],
    [9.6, 0],
  ]) {
    const cx = dc[0] + dx;
    const cy = dc[1] + dy;
    // The 0.5 mm gap between the two D-halves runs radially from the centre.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(dy, dx));
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        0,
        side * 0.25,
        2.5,
        side > 0 ? 0 : Math.PI,
        side > 0 ? Math.PI : Math.PI * 2,
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(dc[0], dc[1], 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "#e8e8e0";
  ctx.fill();
  ctx.fillStyle = CARBON;
  for (const [x, y] of [
    [-28.33, -26.28],
    [-23.52, -26.28],
    [-31.52, -29.78],
    [-20.33, -29.78],
    [-31.52, -33.97],
    [-20.33, -33.97],
    [-28.33, -37.47],
    [-23.52, -37.47],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // A and B: four interdigitated strips inside a Ø7 circle.
  for (const [x, y] of [
    [32.43, -27.42],
    [17.62, -34.02],
  ]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.clip();
    const strips: [number, number][] = [
      [-3.5, 1.8],
      [-1.25, 1.0],
      [0.2, 1.0],
      [1.7, 1.8],
    ];
    for (const [sx, w] of strips) ctx.fillRect(x + sx, y - 3.5, w, 7);
    ctx.restore();
  }
  for (const [x, y] of [
    [11.83, -35.02],
    [15.83, -41.02],
    [20.43, -41.02],
    [24.22, -30.62],
    [24.22, -26.02],
    [27.62, -33.92],
    [32.22, -33.92],
    [32.72, -20.83],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Start / Select: two 4 mm carbon squares each, on a +25° axis.
  for (const [x, y] of [
    [-12.03, -53.42],
    [2.77, -53.42],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((25 * Math.PI) / 180);
    for (const o of [-2.9, 2.9]) {
      ctx.fillStyle = CARBON;
      ctx.fillRect(o - 2, -2, 4, 4);
      ctx.fillStyle = "#3a9a48";
      ctx.fillRect(o - 0.15, -2, 0.3, 4);
      ctx.fillRect(o - 2, -0.15, 4, 0.3);
    }
    ctx.restore();
  }
  // Ribbon solder pads (21 × 0.75 mm, 1.25 mm pitch).
  ctx.fillStyle = "#c0c0c0";
  for (let i = 0; i < 21; i++)
    ctx.fillRect(4.83 - 12.5 + i * 1.25 - 0.375, 46.78 - 1.75, 0.75, 3.5);
}

function paintBack(ctx: CanvasRenderingContext2D) {
  // Back-view coordinates (u = −x). Screw rings marked in white.
  ctx.strokeStyle = "#f2f2ee";
  ctx.lineWidth = 0.3;
  for (const [x, y] of LCD_SCREW_HOLES) {
    ctx.beginPath();
    ctx.arc(-x, y, 2.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Decoy hole: dashed box and a crossed-out screw.
  ctx.save();
  ctx.setLineDash([0.8, 0.6]);
  ctx.strokeRect(-DECOY[0] - 4.2, DECOY[1] - 4.2, 8.4, 8.4);
  ctx.restore();
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(-DECOY[0] - 3.4, DECOY[1] - 3.4);
  ctx.lineTo(-DECOY[0] + 3.4, DECOY[1] + 3.4);
  ctx.moveTo(-DECOY[0] + 3.4, DECOY[1] - 3.4);
  ctx.lineTo(-DECOY[0] - 3.4, DECOY[1] + 3.4);
  ctx.stroke();
  boardText(ctx, "©1989 Nintendo", -18.62, 48.6, 2.2, { weight: 700 });
  boardText(ctx, "DMG LCD-06", -18.62, 44.4, 2.2, { weight: 700 });
  boardText(ctx, "30KVR VR1", 35.4, 31.0, 1.4);
  boardText(ctx, "SP1", -36.12, -45.4, 1.3);
  boardText(ctx, "SP2", -32.12, -45.4, 1.3);
  for (const [ref, x, y] of [
    ["C1", 35.62, 36],
    ["C2", 3.03, -35],
    ["C3", -36.97, 46],
    ["Q1", -11.88, 12.6],
    ["DA1", -15.17, 40.6],
    ["DA2", -15.17, 35.6],
    ["DA3", -15.17, 26.4],
    ["DA4", -15.17, 21.4],
    ["E1", -13.17, 52.4],
    ["E2", -6.67, 19],
    ["E3", 36.33, -15],
  ] as [string, number, number][]) {
    boardText(ctx, ref, -x, y, 1.3);
  }
  ctx.fillStyle = "#c0c0c0";
  for (const [x, y] of [
    [36.12, -43.22],
    [32.12, -43.22],
  ]) {
    ctx.beginPath();
    ctx.arc(-x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --------------------------- LCD module --------------------------------- */

const frameMat = new MeshStandardMaterial({
  color: "#e6e2cc",
  roughness: 0.55,
});
const glassMat = new MeshStandardMaterial({
  color: "#d9d8c4",
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
const polarizerMat = new MeshStandardMaterial({
  color: "#8e8c2c",
  roughness: 0.6,
});
const reflectorMat = new MeshStandardMaterial({
  color: "#a7a89e",
  roughness: 0.3,
  metalness: 0.7,
});
const flexMat = new MeshStandardMaterial({
  color: "#4a2c16",
  roughness: 0.35,
  transparent: true,
  opacity: 0.9,
});
const brassMat = new MeshStandardMaterial({
  color: "#c8a040",
  roughness: 0.3,
  metalness: 1,
});

function lcdModule() {
  const g = new Group();
  // Cream holder frame: 61.8 × 55.8 ring, 1.7 mm walls, 5 mm tall, glass seat at 2.1.
  const fx = 3.03;
  const fy = 25.77;
  let frame: BufferGeometry = extrude(
    roundedRectShape(61.8, 55.8, 1.2, fx, fy),
    5.0,
    0,
    0.3,
    2,
  );
  frame = subtract(
    frame,
    box(58.35, 52.35, 4, fx + 0.07, fy - 0.12, 4.1),
    box(54.0, 47.5, 4, fx, fy, 0.5),
  );
  // Screw ears (lobes + arms), 2 mm thick.
  const ears: BufferGeometry[] = [];
  for (const [x, y, r] of [
    [-12.88, 57.08, 3.25],
    [22.72, 55.08, 3.25],
    [-35.97, 6.68, 3.5],
    [35.93, 6.68, 3.5],
  ]) {
    const lobe = subtract(
      cylZ(r, 2.0, x, y, 1.0, 28),
      cylZ(1.2, 3, x, y, 1.0, 16),
    );
    ears.push(lobe);
    // Arm back to the nearest frame wall.
    const toX = x < fx - 30 ? fx - 30.9 : x > fx + 30 ? fx + 30.9 : x;
    const toY = y > fy + 27 ? fy + 27.9 : y;
    const ax = (x + toX) / 2;
    const ay = (y + toY) / 2;
    const len = Math.hypot(toX - x, toY - y);
    if (len > r) {
      ears.push(
        box(
          Math.abs(toX - x) > 0.1 ? len : r * 1.6,
          Math.abs(toY - y) > 0.1 ? len : r * 1.6,
          2.0,
          ax,
          ay,
          1.0,
        ),
      );
    }
  }
  // Lifted 0.02 mm so its underside never shares a plane with the board.
  const frameMesh = new Mesh(merge([frame, ...ears]), frameMat);
  frameMesh.position.z = 0.02;
  g.add(frameMesh);

  // Reflector + rear polarizer, rear glass (with ledges), front glass, front polarizer.
  g.add(new Mesh(box(50.9, 47.1, 0.26, 0.78, 28.13, 2.25), reflectorMat));
  const rear = new Mesh(box(58.0, 52.2, 1.08, 3.12, 25.58, 2.94), glassMat);
  rear.name = "noshadow";
  g.add(rear);
  const front = new Mesh(box(50.9, 47.1, 1.08, 0.78, 28.13, 4.05), glassMat);
  front.name = "noshadow";
  g.add(front);
  g.add(new Mesh(box(50.15, 45.35, 0.2, 0.85, 27.65, 4.71), polarizerMat));
  // The 160 × 144 active area (shared, animated screen texture).
  const screen = new Mesh(new PlaneGeometry(46.24, 41.62), screenMaterial());
  screen.position.set(0.16, 26.38, 4.86);
  screen.name = "lcd-screen";
  g.add(screen);
  // Black encapsulant over the bottom TAB bond, ITO fan-out on the right ledge.
  g.add(new Mesh(box(52.1, 5.1, 0.25, 0.17, 2.03, 3.62), M.plasticBlack()));
  g.add(
    new Mesh(
      box(5.9, 48, 0.05, 29.17, 25.58, 3.52),
      new MeshStandardMaterial({
        color: "#c9c8b0",
        roughness: 0.3,
        metalness: 0.4,
      }),
    ),
  );

  // Column-driver TAB (LH5077F) folded down over the board front, plus its tail.
  const flex = merge([
    box(43.9, 19.3, 0.1, 0.48, -10.37, 1.35),
    box(6.6, 17.5, 0.1, 25.72, -11.77, 0.15),
    box(2.4, 6, 0.1, 22.0, -6.5, 0.75),
  ]);
  g.add(new Mesh(flex, flexMat));
  g.add(new Mesh(box(11.0, 8.6, 1.0, 0.12, -8.92, 1.9), M.ic()));
  const chipLabel = printDecal(10, 7, (ctx) => {
    ctx.fillStyle = "#e9e3a8";
    ctx.font = "600 1.4px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SHARP", 5, 3);
    ctx.fillText("LH5077F", 5, 5);
  });
  chipLabel.position.set(0.12, -8.92, 2.41);
  g.add(chipLabel);
  const wire = new CylinderGeometry(0.4, 0.4, 19.5, 10);
  wire.translate(23.62, -11.17, 0.6);
  g.add(new Mesh(wire, M.solder()));
  // Two brass screws on the TAB flex (factory sub-assembly).
  for (const [x, y] of [
    [-17.07, -13.83],
    [16.93, -13.83],
  ]) {
    const head = domeCap(1.3, 0.6, 20);
    head.rotateX(Math.PI / 2);
    head.translate(x, y, 1.4);
    const recess = merge([
      box(1.6, 0.3, 0.6, x, y, 2.0),
      box(0.3, 1.6, 0.6, x, y, 2.0),
    ]);
    g.add(
      new Mesh(
        subtract(merge([head, cylZ(1.3, 0.3, x, y, 1.55, 20)]), recess),
        brassMat,
      ),
    );
  }
  return g;
}

export function buildLcdBoard() {
  const g = new Group();
  g.add(
    buildBoard({
      outline: OUTLINE,
      holes: HOLES,
      thickness: T,
      frontColor: "#3a9a48",
      backColor: "#1d5a3c",
      paintFront,
      paintBack,
    }),
  );
  g.add(lcdModule());

  // Power LED (front), shares the glowing material.
  const led = new Mesh(
    merge([
      cylZ(1.5, 3.4, 0, 0, 1.7 + 0.3, 24),
      cylZ(1.9, 0.6, 0, 0, 0.3, 24),
      (() => {
        const d = domeCap(1.5, 1.5, 20);
        d.rotateX(Math.PI / 2);
        d.translate(0, 0, 3.7);
        return d;
      })(),
    ]),
    ledMaterial(),
  );
  led.position.set(-31.88, 33.78, 0);
  g.add(led);

  // Bias regulator U1 (under the flex) and the ribbon's soldered first section.
  const u1 = sop({
    bodyL: 7.2,
    bodyW: 5.3,
    bodyH: 1.0,
    pinsPerSide: 10,
    pitch: 0.65,
    span: 7.6,
  });
  u1.position.set(8.43, -8.83, 0);
  g.add(u1);
  const ribbon = new Mesh(
    box(27.6, 58.73 - 44.88 + 1.2, 0.12, 4.83, (58.73 + 44.88) / 2 + 0.6, 0.1),
    new MeshStandardMaterial({
      color: "#e9ecec",
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    }),
  );
  g.add(ribbon);

  // ---------------- back side ----------------
  const back = (o: Group | Mesh, x: number, y: number, rz = 0) => {
    const outer = new Group();
    outer.position.set(x, y, -T);
    outer.rotation.y = Math.PI;
    const inner = new Group();
    inner.rotation.z = rz;
    inner.add(o);
    outer.add(inner);
    return outer;
  };
  // Contrast pot body and its Ø16, 60-tooth thumbwheel overhanging the left edge.
  g.add(new Mesh(box(9.5, 10, 2.2, -35.38, 23.48, -T - 1.1), M.steel()));
  const wheel = new Mesh(thumbwheel(16, 1.6), M.plasticBlack());
  wheel.position.set(-36.17, 23.48, -T - 1.08);
  wheel.name = "contrast-wheel";
  g.add(wheel);
  // Electrolytics (lying).
  g.add(back(lyingElectrolytic(5, 8, 1), 35.62, 30.58, Math.PI / 2));
  g.add(back(lyingElectrolytic(5, 8, 1), 3.03, -28.77, Math.PI / 2));
  g.add(back(lyingElectrolytic(4, 7, 1), -36.97, 42.28, Math.PI));
  for (const x of [-17.47, -9.88, -1.77])
    g.add(back(lyingElectrolytic(4, 5.5, 1), x, -0.42, -Math.PI / 2));
  for (const x of [-6.67, 6.03])
    g.add(back(lyingElectrolytic(4, 5.5, 1), x, -13.33));
  g.add(back(ceramicDisc(3.0, "x", 1, 1.1), -20.38, 6.88));
  g.add(back(ceramicDisc(3.5, "x", 1, 1.1), 10.03, -23.52));
  g.add(
    back(
      axial({
        length: 3.3,
        d: 1.6,
        pitch: 7.5,
        color: "#d8c9a4",
        bands: ["brown", "black", "red", "gold"],
        dir: 1,
      }),
      -23.97,
      55.68,
    ),
  );
  g.add(
    back(
      axial({
        length: 3.3,
        d: 1.6,
        pitch: 7.5,
        color: "#d8c9a4",
        bands: ["brown", "black", "brown", "gold"],
        dir: 1,
      }),
      15.22,
      2.08,
    ),
  );
  g.add(
    back(
      axial({
        length: 2.6,
        d: 1.6,
        pitch: 7.5,
        color: "#c2502a",
        bands: ["black"],
        glass: true,
        dir: 1,
      }),
      -32.77,
      50.08,
      Math.PI / 2,
    ),
  );
  // Q1 (2SA933, TO-92S, semi-lying).
  g.add(new Mesh(box(4.0, 2.4, 3.0, -11.88, 9.38, -T - 1.5), M.ic()));
  // DAN215 arrays, row-driver TAB IC through its window.
  g.add(
    new Mesh(
      merge(
        [38.38, 33.38, 24.18, 19.18].map((y) =>
          box(7.0, 2.4, 1.6, -15.17, y, -T - 0.8),
        ),
      ),
      M.ic(),
    ),
  );
  g.add(
    new Mesh(
      box(8.8, 10.4, 1.6, 8.03, 29.08, -T - 0.2),
      new MeshStandardMaterial({ color: "#141414", roughness: 0.85 }),
    ),
  );
  // Ground spring clips E1–E3 (touch the CPU board shield when closed).
  for (const [x, y, rz] of [
    [-13.17, 48.28, 0],
    [-6.67, 14.98, 0],
    [36.33, -10.62, Math.PI / 2],
  ]) {
    const clip = merge([
      box(5.0, 6.5, 0.3, 0, 0, -0.15),
      box(4.0, 0.3, 3.2, 0, 3.0, -1.6),
      box(3.2, 4.8, 0.3, 0, 1.0, -3.4),
    ]);
    const m = new Mesh(clip, M.nickel());
    m.position.set(x, y, -T);
    m.rotation.z = rz;
    g.add(m);
  }
  // Wire jumpers J1–J5.
  const jumpers = [
    box(0.6, 15.9, 0.6, -8.27, 34.38, -T - 0.4),
    box(14.6, 0.6, 0.6, -29.77, -7.92, -T - 0.4),
    box(15.5, 0.6, 0.6, 1.53, -44.72, -T - 0.4),
    box(0.6, 14.6, 0.6, -10.38, -33.33, -T - 0.4),
    box(0.6, 14.6, 0.6, -4.97, -33.33, -T - 0.4),
  ];
  g.add(new Mesh(merge(jumpers), M.solder()));
  // Solder joints for the through-hole parts.
  g.add(
    solderJoints(
      [
        [-31.88, 32.5],
        [-31.88, 35.05],
        [-28.6, 19.5],
        [-28.6, 21.5],
        [-28.6, 23.5],
        [-28.6, 25.5],
        [35.62, 34.2],
        [35.62, 27],
        [3.03, -24.9],
        [3.03, -32.6],
        [-33.5, 42.28],
        [-40, 42.28],
        [-23.97, 59.4],
        [-23.97, 51.9],
        [15.22, 5.8],
        [15.22, -1.6],
        [-32.77, 53.8],
        [-32.77, 46.3],
        [-13.1, 9.38],
        [-11.88, 9.38],
        [-10.66, 9.38],
      ],
      -T,
      -1,
    ),
  );
  return g;
}

/** Ribbon exit point (local, at the board's top edge) for the dynamic flex. */
export const LCD_RIBBON_EXIT: [number, number, number] = [
  4.83,
  58.73 + 0.6,
  0.1,
];
