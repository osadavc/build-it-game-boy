import {
  type BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Path,
  Shape,
} from "three";
import { box, extrude, merge, subtract } from "@/lib/three/csg";
import { polygonShape } from "@/lib/three/shapes";
import { M } from "../materials";
import { crystal, electrolytic, qfp, sop } from "./electronics";
import {
  axial,
  boardText,
  buildBoard,
  ceramicDisc,
  lyingElectrolytic,
  PCB_COLORS,
  solderJoints,
  thumbwheel,
} from "./pcb";
import { springGeometry } from "./power";

/*
 * DMG-CPU-06, traced from Gekkio's 600 dpi scan (±0.3 mm). Board-local frame:
 * seen from the FRONT of the Game Boy (the solder side), origin at the outline
 * centre, solder face z = 0. Every component hangs off the back (component)
 * face at z = −T and faces the rear housing.
 */
export const CPU_T = 1.2;
const T = CPU_T;

/** Device placement: board centre and solder-face Z. */
export const CPU_PLACEMENT = { x: 0.5, y: 29.0, z: 3.0 };

/** AA cell axis height in the battery bay (device Z). */
export const CELL_Z = -5.25;

const OUTLINE: [number, number][] = [
  [-40.05, 39.57],
  [-40.05, -21.27],
  [-37.37, -21.27],
  [-36.63, -21.42],
  [-36.01, -21.84],
  [-35.59, -22.46],
  [-35.44, -23.2],
  [-35.59, -23.94],
  [-36.01, -24.56],
  [-36.63, -24.98],
  [-37.37, -25.13],
  [-40.05, -25.13],
  [-40.05, -39.58],
  [40.05, -39.58],
  [40.05, -25.13],
  [36.4, -25.13],
  [35.66, -24.98],
  [35.04, -24.56],
  [34.62, -23.94],
  [34.47, -23.2],
  [34.62, -22.46],
  [35.04, -21.84],
  [35.66, -21.42],
  [36.4, -21.27],
  [40.05, -21.27],
  [40.05, 39.57],
];

const HOLES = [
  { pos: [36.45, 26.6], d: 2.4 },
  { pos: [-37.36, 26.6], d: 2.4 },
  { pos: [30.2, -30.0], d: 4.5 },
  { pos: [-31.5, -30.0], d: 4.5 },
  { pos: [27.35, -23.4], d: 2.7 },
  { pos: [-28.55, -23.4], d: 2.7 },
  { pos: [34.9, -34.5], d: 3.6 },
  { pos: [-35.4, -34.4], d: 4.0 },
] as { pos: [number, number]; d: number }[];

/** Cartridge-connector pins: odd row y −32.72, even row y −31.28, 1.5 mm pitch. */
const CART_PINS: [number, number][] = Array.from({ length: 32 }, (_, i) => [
  22.58 - i * 1.4958,
  i % 2 === 0 ? -32.72 : -31.28,
]);

/** Footprint outlines for the component-side silkscreen (front-view coords). */
const SILK: [string, number, number, number, number][] = [
  ["U1", 4.35, 14.41, 21, 15],
  ["U2", -18.25, 18.95, 9.4, 18.4],
  ["U3", -18.62, -4.79, 18.4, 9.4],
  ["U4", -33.7, 2.2, 7.8, 6.6],
  ["X1", 21.5, 5.07, 5, 11.4],
  ["C1", 36.5, 35.76, 6.6, 6.6],
  ["C2", -38.4, 3.2, 6.6, 6.6],
  ["SW1", -30.6, 36.5, 17, 7],
  ["P2", 38.0, 16.1, 13.4, 13.6],
  ["DC", -37.85, 19.3, 13, 10.8],
  ["VR1", 33.0, -4.9, 11.4, 11.4],
  ["J1", -37.7, -13.6, 3, 11.4],
  ["J3", -34.9, -39.0, 10.8, 2.8],
];

function paintBack(ctx: CanvasRenderingContext2D) {
  // Back-view coordinates: u = −x.
  ctx.strokeStyle = PCB_COLORS.silk;
  ctx.lineWidth = 0.2;
  for (const [ref, x, y, w, h] of SILK) {
    ctx.strokeRect(-x - w / 2, y - h / 2, w, h);
    boardText(ctx, ref, -x - w / 2 + 1.6, y + h / 2 + 1.2, 1.3);
  }
  // Cartridge connector pin field.
  ctx.fillStyle = PCB_COLORS.tin;
  for (const [x, y] of CART_PINS) {
    ctx.beginPath();
    ctx.arc(-x, y, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ground pads for the cartridge shield tabs.
  ctx.fillRect(-35.6 - 4, 27.2 - 2.85, 8.0, 5.7);
  ctx.fillRect(36.0 - 3.4, 27.2 - 2.85, 6.8, 5.7);
  // Unpopulated 2 × 3 pad grid.
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      ctx.arc(
        -(13.0 - 2.5 + i * 2.5),
        33.45 - 1.25 + j * 2.5,
        0.8,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  // A few trunk traces (visible as darker copper under the mask).
  ctx.strokeStyle = "rgba(10, 70, 40, 0.55)";
  ctx.lineWidth = 0.35;
  for (let i = 0; i < 16; i++) {
    const x = -(4.35 - 9 + i * 1.2);
    ctx.beginPath();
    ctx.moveTo(x, 7.4);
    ctx.lineTo(x, -16 + (i % 4));
    ctx.lineTo(-(-0.67 - 24 + i * 3.0), -20.5);
    ctx.stroke();
  }
  boardText(ctx, "©1989 Nintendo", 1.25, -35.0, 1.9, { weight: 700 });
  boardText(ctx, "DMG-CPU-06", 0.85, -37.3, 1.4, { weight: 700 });
  boardText(ctx, "DMG CPU", -4.0, 25.5, 1.4);
  boardText(ctx, "MAIN SW", 30.6, 31.6, 1.2);
  boardText(ctx, "VR1 10Kx2", -33.0, -12.3, 1.2);
}

function paintFront(ctx: CanvasRenderingContext2D) {
  // Ribbon socket tails and pin numbers.
  ctx.fillStyle = PCB_COLORS.tin;
  for (let i = 0; i < 21; i++)
    ctx.fillRect(-8.1 + i * 1.25 - 0.3, 25.06 - 1.7, 0.6, 3.4);
  ctx.fillRect(-11.2, 23.3, 2.2, 3.6);
  ctx.fillRect(17.9, 23.3, 2.2, 3.6);
  boardText(ctx, "1", -8.1, 27.9, 1.4);
  boardText(ctx, "21", 16.9, 27.9, 1.4);
  ctx.fillRect(-11.9 - 2, 26.0 - 1.75, 4.0, 3.5);
}

/** Back-mounted wrapper: builds `obj` facing +Z, turns it over and places it. */
function back(obj: Object3D, x: number, y: number, rotZ = 0) {
  const outer = new Group();
  outer.position.set(x, y, -T);
  outer.rotation.y = Math.PI;
  const inner = new Group();
  inner.rotation.z = rotZ;
  inner.add(obj);
  outer.add(inner);
  return outer;
}

function cartridgeConnector() {
  const g = new Group();
  const cx = -0.67;
  const cy = -23.22;
  const H = 9.0;
  // Chamfered body, hollowed into a slot that opens to +Y.
  let body: BufferGeometry = extrude(
    polygonShape(
      [
        [cx - 34.05, cy - 10.5],
        [cx + 34.05, cy - 10.5],
        [cx + 34.05, cy + 10.5],
        [cx - 34.05, cy + 10.5],
      ],
      2.0,
    ),
    H,
    -T - H,
    0.4,
    2,
  );
  const slotZ = -T - 6.3;
  body = subtract(
    body,
    box(50.0, 18, 1.6, cx, cy + 3.5, slotZ),
    // Lead-in funnel.
    box(52.0, 2, 3.2, cx, cy + 10.2, slotZ),
  );
  g.add(new Mesh(body, M.plasticBlack()));
  // Flanges with Ø4.6 bores for the case bosses.
  const flange = (x0: number, x1: number) => {
    const s = new Shape();
    s.moveTo(x0, -27.22);
    s.lineTo(x1, -27.22);
    s.lineTo(x1, -19.22);
    s.lineTo(x0, -19.22);
    s.closePath();
    const h = new Path();
    const hx = x0 < 0 ? -37.37 : 36.4;
    h.absarc(hx, -23.2, 2.3, 0, Math.PI * 2, true);
    s.holes.push(h);
    return extrude(s, 2.0, -T - 2.0);
  };
  g.add(
    new Mesh(
      merge([flange(33.38, 37.58), flange(-38.92, -34.72)]),
      M.plasticBlack(),
    ),
  );
  // Gold contact fingers visible inside the slot.
  const fingers: BufferGeometry[] = [];
  for (let i = 0; i < 32; i++) {
    const x = cx + 23.25 - i * 1.5;
    fingers.push(box(0.7, 6, 0.3, x, cy + 4, slotZ + 0.85));
    fingers.push(box(0.7, 6, 0.3, x, cy + 4, slotZ - 0.85));
  }
  g.add(new Mesh(merge(fingers), M.gold()));
  return g;
}

function powerSwitch() {
  const g = new Group();
  const [x, y] = [-30.6, 36.5];
  // Tin-plated steel frame with folded tabs.
  g.add(
    new Mesh(
      merge([
        box(16.5, 6.6, 4.4, x, y, -T - 2.2),
        box(1.2, 2.0, 1.6, x - 7.85, y, -T + 0.4),
        box(1.2, 2.0, 1.6, x + 7.85, y, -T + 0.4),
      ]),
      new MeshStandardMaterial({
        color: "#b9b6aa",
        roughness: 0.35,
        metalness: 0.85,
      }),
    ),
  );
  // Black actuator nub poking past the board's top edge (OFF position).
  const knob = new Mesh(box(3.4, 6.8, 2.5, 0, 0, 0), M.plasticBlack());
  knob.name = "sw-knob";
  knob.position.set(-33.9, 41.2 - 2.6, -T - 2.2);
  g.add(knob);
  return g;
}

function dcJack() {
  const g = new Group();
  const [x, y] = [-37.85, 19.3];
  const zAxis = -T - 4.9;
  let body: BufferGeometry = merge([box(12.7, 10.5, 7.0, x, y, -T - 3.5)]);
  const bore = new CylinderGeometry(1.8, 1.8, 10, 24);
  bore.rotateZ(Math.PI / 2);
  bore.translate(x - 4, y, zAxis);
  body = subtract(body, bore);
  g.add(new Mesh(body, M.plasticBlack()));
  const pin = new CylinderGeometry(0.675, 0.675, 8, 12);
  pin.rotateZ(Math.PI / 2);
  pin.translate(x - 3, y, zAxis);
  g.add(new Mesh(pin, M.gold()));
  return g;
}

function linkPort() {
  const g = new Group();
  const [x, y] = [38.0, 16.1];
  const zc = -T - 3.75;
  let shell: BufferGeometry = box(13.1, 13.4, 7.5, x, y, zc);
  shell = subtract(shell, box(10, 9.5, 5.0, x + 3.1, y, zc));
  g.add(new Mesh(shell, M.nickel()));
  // Grey insert with six contacts.
  const insert = subtract(
    box(8, 7.2, 3.0, x + 2.0, y, zc),
    box(6, 5.6, 1.4, x + 3.4, y, zc),
  );
  g.add(
    new Mesh(
      insert,
      new MeshStandardMaterial({ color: "#9a9a9a", roughness: 0.6 }),
    ),
  );
  const pins = [-2, -0.67, 0.67, 2].flatMap((o) => [
    box(4, 0.5, 0.3, x + 4, y + o, zc + 0.4),
  ]);
  g.add(new Mesh(merge(pins), M.gold()));
  return g;
}

function volumeWheel() {
  const g = new Group();
  // Pot body 11 × 11 × 1.5 on the board, the knurled Ø16 rotor below it.
  g.add(new Mesh(box(11, 11, 1.5, 33.0, -4.9, -T - 0.75), M.steel()));
  const wheel = new Mesh(thumbwheel(16, 2.5), M.plasticBlack());
  wheel.position.set(36.4, -4.9, -T - 2.25);
  wheel.name = "volume-wheel";
  g.add(wheel);
  return g;
}

function header4(pins: [number, number][], along: "x" | "y") {
  const xs = pins.map((p) => p[0]);
  const ys = pins.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = along === "x" ? Math.max(...xs) - Math.min(...xs) + 2.6 : 2.6;
  const h = along === "y" ? Math.max(...ys) - Math.min(...ys) + 2.6 : 2.6;
  return new Mesh(
    box(w, h, 2.2, cx, cy, -T - 1.1),
    new MeshStandardMaterial({ color: "#a9a9a9", roughness: 0.6 }),
  );
}

/** Battery pack terminals soldered to the bottom edge (plate + spring). */
function batteryTerminals() {
  const g = new Group();
  const zc = CELL_Z - CPU_PLACEMENT.z; // cell axis, in board-local Z
  // Contact faces sit on the bay's top end wall (device y −12.33).
  const py = -12.33 - CPU_PLACEMENT.y;
  const plateMat = M.nickel();
  // (+) plate bracket, front-view x −22.4.
  g.add(
    new Mesh(
      merge([
        box(13.0, 0.3, Math.abs(zc) + 6.5 - T, -22.4, py, (-T + zc - 6.5) / 2),
        box(
          13.0,
          Math.abs(py + 39.6) + 0.3,
          0.3,
          -22.4,
          (py - 39.6) / 2,
          -T - 0.15,
        ),
        box(3.6, 2.4, 0.3, -22.4 + 4.3, -38.6, -T - 0.15),
        box(3.6, 2.4, 0.3, -22.4 - 4.3, -38.6, -T - 0.15),
      ]),
      plateMat,
    ),
  );
  const bump = new CylinderGeometry(3, 3, 1, 24);
  bump.translate(-22.4, py - 0.65, zc);
  g.add(new Mesh(bump, plateMat));
  // (−) spring bracket, x +21.3, coil along −Y.
  g.add(
    new Mesh(
      merge([
        box(12.6, 0.3, Math.abs(zc) + 6.5 - T, 21.3, py, (-T + zc - 6.5) / 2),
        box(
          12.6,
          Math.abs(py + 39.6) + 0.3,
          0.3,
          21.3,
          (py - 39.6) / 2,
          -T - 0.15,
        ),
        box(3.6, 2.4, 0.3, 21.3 + 4.3, -38.6, -T - 0.15),
        box(3.6, 2.4, 0.3, 21.3 - 4.3, -38.6, -T - 0.15),
      ]),
      plateMat,
    ),
  );
  const coil = springGeometry(6.0, 0.5, 6, 7.5);
  coil.rotateX(Math.PI); // coil runs along −Y into the battery bay
  const spring = new Mesh(coil, plateMat);
  spring.position.set(21.3, py - 0.15, zc);
  g.add(spring);
  return g;
}

function copperShield() {
  const pts: [number, number][] = [
    [-20.4, 22.4],
    [-10.8, 22.4],
    [-10.8, 16.9],
    [2.2, 8.4],
    [12.4, 8.4],
    [12.7, 13.3],
    [18.3, 13.6],
    [18.5, 6.8],
    [14.6, 5.8],
    [14.5, -13.8],
    [30.8, -13.8],
    [31.0, -1.0],
    [38.5, -1.0],
    [38.5, -9.7],
    [36.4, -9.7],
    [36.1, -22.7],
    [32.3, -26.6],
    [-34.4, -26.6],
    [-34.6, -14.0],
    [-30.8, -14.0],
    [-30.9, 2.9],
    [-13.5, 2.9],
    [-13.5, 6.8],
    [-20.3, 6.8],
  ];
  const s = polygonShape(pts, 0.4);
  const win = new Path();
  win.moveTo(-9.8 - 3.45, -9.05 - 2.65);
  win.lineTo(-9.8 + 3.45, -9.05 - 2.65);
  win.lineTo(-9.8 + 3.45, -9.05 + 2.65);
  win.lineTo(-9.8 - 3.45, -9.05 + 2.65);
  win.closePath();
  s.holes.push(win);
  const g = new Group();
  const plate = new Mesh(
    extrude(s, 0.3, 0.02),
    new MeshStandardMaterial({
      color: PCB_COLORS.shield,
      roughness: 0.35,
      metalness: 0.85,
    }),
  );
  g.add(plate);
  // Six solder blobs tacking the shield down.
  const blobs = [
    [-14.4, 19.4],
    [-9.4, 5.75],
    [15.5, 11.4],
    [36.5, -4.8],
    [26.4, -17.9],
    [-21.4, -20.9],
  ].map(([x, y]) => {
    const c = new CylinderGeometry(1.4, 2.0, 0.9, 16);
    c.rotateX(Math.PI / 2);
    c.translate(x, y, 0.75);
    return c;
  });
  g.add(new Mesh(merge(blobs), M.solder()));
  // Exposed tinned GND pad in the window.
  g.add(new Mesh(box(6.2, 4.6, 0.05, -9.8, -9.05, 0.03), M.solder()));
  return g;
}

export function buildCpuBoard() {
  const g = new Group();
  g.add(
    buildBoard({
      outline: OUTLINE,
      holes: HOLES,
      thickness: T,
      frontColor: PCB_COLORS.maskCopper,
      backColor: PCB_COLORS.maskLaminate,
      paintBack,
      paintFront,
    }),
  );

  // ICs (labels read from behind, as on the real board).
  g.add(
    back(
      qfp({
        bodyL: 20,
        bodyW: 14,
        bodyH: 2.85,
        pinsL: 24,
        pinsW: 16,
        pitch: 0.8,
        span: 24.8,
        label: ["DMG-CPU B", "©1989 Nintendo", "JAPAN", "9207 D"],
      }),
      4.35,
      14.41,
    ),
  );
  g.add(
    back(
      sop({
        bodyL: 17.7,
        bodyW: 8.6,
        bodyH: 2.4,
        pinsPerSide: 14,
        pitch: 1.27,
        span: 12.0,
        label: ["LH5264N4", "SHARP", "JAPAN 9204 5 Y"],
      }),
      -18.25,
      18.95,
      Math.PI / 2,
    ),
  );
  g.add(
    back(
      sop({
        bodyL: 17.7,
        bodyW: 8.6,
        bodyH: 2.4,
        pinsPerSide: 14,
        pitch: 1.27,
        span: 12.0,
        label: ["LH5264N4", "SHARP", "JAPAN 9204 5 Y"],
      }),
      -18.62,
      -4.79,
    ),
  );
  g.add(
    back(
      sop({
        bodyL: 7.1,
        bodyW: 6.0,
        bodyH: 1.6,
        pinsPerSide: 9,
        pitch: 0.8,
        span: 9.4,
        label: ["DMG-AMP", "IR3R40", "9204 A"],
      }),
      -33.7,
      2.2,
    ),
  );
  g.add(back(crystal(11.05, 4.65, 3.8), 21.5, 5.07, Math.PI / 2));

  // Capacitors.
  g.add(back(electrolytic(6.3, 7.0), 36.5, 35.76));
  g.add(back(electrolytic(6.3, 7.0), -38.4, 3.2));
  g.add(back(lyingElectrolytic(4, 7, 1), 13.0, -0.4, Math.PI));
  g.add(back(lyingElectrolytic(4, 7, 1), 13.4, -8.6, Math.PI));
  g.add(back(lyingElectrolytic(4, 7, 1), -38.5, -7.0, Math.PI));
  g.add(back(lyingElectrolytic(4, 7, 1), -6.6, 30.0, Math.PI / 2));
  const discs: [number, number, number, "x" | "y"][] = [
    [-35.1, 11.25, 4.5, "x"],
    [-29.6, 13.2, 4.5, "y"],
    [-30.04, 21.15, 4.5, "y"],
    [35.9, 5.05, 6.5, "x"],
    [36.0, 7.45, 8.0, "x"],
    [2.45, 34.56, 4.5, "x"],
    [-15.05, 34.0, 4.5, "x"],
    [-17.6, 4.7, 4.5, "x"],
    [38.5, -15.88, 4.5, "y"],
    [28.96, 24.65, 4, "y"],
    [26.48, 24.65, 4, "y"],
    [23.92, 24.65, 4, "y"],
    [21.46, 24.65, 4, "y"],
    [-29.56, 28.4, 4, "y"],
    [22.7, 11.55, 4, "x"],
    [23.1, -1.5, 4, "x"],
  ];
  for (const [x, y, d, ax] of discs)
    g.add(back(ceramicDisc(d, ax, 1, 1.0), x, y));

  // Resistors and diodes (axial, lying).
  const axials: [number, number, number, string, string[], number, boolean?][] =
    [
      [24.67, 19.4, 0, "#d9c3a0", ["red", "red", "brown", "gold"], 7.8],
      [24.7, 17.0, 0, "#d9c3a0", ["red", "red", "brown", "gold"], 7.8],
      [24.67, 14.6, 0, "#d9c3a0", ["red", "red", "brown", "gold"], 7.8],
      [-0.33, 31.6, 0, "#d9c3a0", ["red", "red", "brown", "gold"], 7.5],
      [
        25.95,
        -7.7,
        Math.PI / 2,
        "#d9c3a0",
        ["green", "brown", "brown", "gold"],
        7.5,
      ],
      [
        23.37,
        -7.85,
        Math.PI / 2,
        "#d9c3a0",
        ["green", "brown", "brown", "gold"],
        7.5,
      ],
      [
        -20.05,
        34.3,
        Math.PI / 2,
        "#d9c3a0",
        ["brown", "grey", "yellow", "gold"],
        7.5,
      ],
      [
        24.86,
        5.23,
        Math.PI / 2,
        "#d9c3a0",
        ["brown", "black", "green", "gold"],
        7.5,
      ],
    ];
  for (const [x, y, r, color, bands, pitch] of axials)
    g.add(
      back(
        axial({ length: 3.4, d: 1.8, pitch, color, bands, dir: 1 }),
        x,
        y,
        r,
      ),
    );
  g.add(
    back(
      axial({
        length: 4.5,
        d: 2.5,
        pitch: 7.5,
        color: "#2f5fa8",
        bands: ["white"],
        dir: 1,
      }),
      -26.58,
      25.97,
      Math.PI / 2,
    ),
  );
  g.add(
    back(
      axial({
        length: 3.0,
        d: 1.7,
        pitch: 7.5,
        color: "#e08a3a",
        bands: ["black"],
        glass: true,
        dir: 1,
      }),
      27.9,
      5.34,
      Math.PI / 2,
    ),
  );

  // DA216 diode arrays (SIP-3, leaning).
  const das = [29.5, 26.5, 23.45, 20.45].map((x) => {
    const b = box(2.6, 6.5, 2.6, x, 31.57, -T - 2.1);
    return b;
  });
  g.add(new Mesh(merge(das), M.ic()));

  g.add(cartridgeConnector());
  g.add(powerSwitch());
  g.add(dcJack());
  g.add(linkPort());
  g.add(volumeWheel());
  g.add(
    header4(
      [
        [-36.6, -9.85],
        [-36.6, -12.33],
        [-36.6, -14.76],
        [-36.6, -17.32],
      ],
      "y",
    ),
  );
  g.add(
    header4(
      [
        [-31.16, -37.25],
        [-33.65, -37.25],
        [-36.15, -37.25],
        [-38.7, -37.25],
      ],
      "x",
    ),
  );
  g.add(batteryTerminals());

  // Front (solder) side: ribbon socket, shield, joints.
  const ffc = subtract(
    box(30, 6.2, 2.4, 4.3, 19.9, 1.2),
    box(28, 2, 0.5, 4.3, 17.6, 1.2),
  );
  g.add(
    new Mesh(
      ffc,
      new MeshStandardMaterial({ color: "#e9e4d4", roughness: 0.55 }),
    ),
  );
  const ffcPins = merge(
    Array.from({ length: 21 }, (_, i) =>
      box(0.5, 2.2, 0.2, -8.1 + i * 1.25, 23.9, 0.12),
    ),
  );
  g.add(new Mesh(ffcPins, M.solder()));
  g.add(copperShield());

  const joints: [number, number][] = [...CART_PINS];
  const add = (x: number, y: number, dx: number, dy: number, n = 2) => {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      joints.push([x + dx * t * 2, y + dy * t * 2]);
    }
  };
  add(36.5, 35.76, 2.55, 0);
  add(-38.4, 3.2, 2.55, 0);
  for (const [x, y, , ax] of discs)
    add(x, y, ax === "x" ? 1.25 : 0, ax === "y" ? 1.25 : 0);
  for (const [x, y, r, , , pitch] of axials)
    add(x, y, r ? 0 : pitch / 2, r ? pitch / 2 : 0);
  add(21.5, 5.07, 0, 2.44);
  for (const x of [29.5, 26.5, 23.45, 20.45]) add(x, 31.57, 0, 2.5, 3);
  for (const y of [-9.85, -12.33, -14.76, -17.32]) joints.push([-36.6, y]);
  for (const x of [-31.16, -33.65, -36.15, -38.7]) joints.push([x, -37.25]);
  for (const dx of [-4, 0, 4])
    for (const dy of [-1.2, 1.2]) joints.push([-30.6 + dx, 36.5 + dy]);
  for (let i = 0; i < 5; i++) joints.push([28.6, -8.9 + i * 2]);
  for (let i = 0; i < 6; i++)
    joints.push([33.5 + (i % 3) * 2.5, 13.6 + Math.floor(i / 3) * 5]);
  joints.push([-42, 19.3], [-35, 15.5], [-35, 23.1]);
  joints.push([17.46, 2.13], [17.48, -2.91], [17.44, -6.45], [17.49, -11.42]);
  joints.push([-34.1, -4.86], [-34.12, -9.88], [-4.05, 34.62], [-9.05, 34.49]);
  joints.push([-26.58, 22.2], [-26.58, 29.7], [27.9, 1.6], [27.9, 9.1]);
  g.add(
    solderJoints(
      joints.filter(([x, y]) => Math.abs(x) < 39.5 && Math.abs(y) < 39),
      0,
      1,
    ),
  );
  return g;
}
