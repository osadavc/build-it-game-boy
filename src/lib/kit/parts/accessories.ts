import {
  type BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
} from "three";
import { printDecal } from "@/lib/three/canvas-texture";
import {
  box,
  cylZ,
  extrude,
  intersect,
  merge,
  subtract,
} from "@/lib/three/csg";
import { circleHole, roundedRectShape } from "@/lib/three/shapes";
import { M } from "../materials";
import { GUARD_SCREWS } from "./back-shell";
import { electrolytic } from "./electronics";
import { axial, buildBoard, solderJoints } from "./pcb";
import { bodySolid, ZF } from "./shell-common";

/* ------------------------------ Battery cover ---------------------------- */

/** Nintendo 18098, built in the device frame (flush with the back at −16.125). */
export function buildBatteryCover() {
  const top = -11.7;
  const bottom = -69.5;
  const cy = (top + bottom) / 2;
  const T = 1.6;
  let plate: BufferGeometry = extrude(
    roundedRectShape(61.4, 57.6, 1.0, 0, cy),
    T,
    ZF.back,
  );
  // Follow the shell's R6.5 bottom fillet exactly.
  plate = intersect(
    plate,
    bodySolid(
      ZF.back,
      ZF.seam,
      { left: 8, right: 8, top: 3, bottom: 6.5 },
      0,
      12,
    ),
  );
  // Ten 1.1 × 0.5 grip grooves at 4.0 pitch, round-bottomed.
  const grooves = Array.from({ length: 10 }, (_, i) => {
    const c = new CylinderGeometry(0.55, 0.55, 58.4, 12);
    c.rotateZ(Math.PI / 2);
    c.translate(0, -13.2 - i * 4.0, ZF.back);
    return c;
  });
  plate = subtract(plate, merge(grooves));
  const parts: BufferGeometry[] = [plate];
  // Tongue and cantilever latch arm reaching up into the latch notch.
  parts.push(box(12.7, 1.15, 1.2, 0, top + 0.575, ZF.back + 0.4 + 0.6));
  parts.push(box(5.0, 3.65, 0.8, 0, -8.725, ZF.back + 0.9));
  // Finger pad with three small ribs.
  parts.push(box(6.0, 1.8, 0.7, 0, -7.8, ZF.back + 0.65));
  for (const dy of [-0.55, 0, 0.55])
    parts.push(box(5.4, 0.25, 0.25, 0, -7.8 + dy, ZF.back + 0.2));
  // Hook on the inner face that catches the shell ledge.
  parts.push(box(5.0, 0.7, 1.4, 0, -6.6, ZF.back + 1.6 + 0.3));
  // Hinge tabs on the bottom edge (inner side).
  for (const x of [21.3, -21.3])
    parts.push(box(4.0, 2.2, 0.8, x, bottom - 0.4, ZF.back + T - 0.4));
  // Inner stiffening ribs.
  for (const x of [-15, 0, 15])
    parts.push(box(1.0, 52, 0.8, x, cy, ZF.back + T + 0.4));
  const g = new Group();
  g.add(
    new Mesh(
      merge(parts),
      new MeshStandardMaterial({ color: "#c9c5c0", roughness: 0.6 }),
    ),
  );
  return g;
}

/* ------------------------------- Screen lens ----------------------------- */

const LENS = {
  w: 74.3,
  h: 56.3,
  t: 0.9,
  r: { tl: 2.6, tr: 2.6, bl: 2.6, br: 11.6 },
};

/** Nintendo 18418. Local origin at the lens centre, back face z = 0 (print side). */
export function buildLens() {
  const g = new Group();
  const body = extrude(
    roundedRectShape(LENS.w, LENS.h, LENS.r),
    LENS.t,
    0,
    0.15,
    2,
  );
  const clear = new MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.03,
    metalness: 0,
    transparent: true,
    opacity: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });
  const m = new Mesh(body, clear);
  m.name = "noshadow";
  g.add(m);
  // Back-printed mask: everything grey except window, LED dot, text and stripes.
  const print = printDecal(
    LENS.w,
    LENS.h,
    (ctx) => {
      const W = LENS.w;
      const H = LENS.h;
      // Lens-local mm → canvas (origin top-left, y down).
      const X = (x: number) => x + W / 2;
      const Y = (y: number) => H / 2 - y;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0.6, 0.6, W - 1.2, H - 1.2, [2.2, 2.2, 11.2, 2.2]);
      ctx.fillStyle = "#57545d";
      ctx.fill();
      ctx.restore();
      // Window (47.7 × 43.5 at lens (0, 0.15)) and LED dot punched out.
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.roundRect(X(-23.85), Y(0.15 + 21.75), 47.7, 43.5, 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X(-31.8), Y(39.55 - 32.7), 1.225, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      // Stripes: magenta over navy, round caps.
      ctx.lineCap = "round";
      ctx.lineWidth = 0.5;
      for (const [y, color] of [
        [58.51, "#7f2a5c"],
        [57.03, "#2b2266"],
      ] as [number, string][]) {
        ctx.strokeStyle = color;
        for (const [x0, x1] of [
          [-34.13, -14.22],
          [25.73, 34.42],
        ]) {
          ctx.beginPath();
          ctx.moveTo(X(x0), Y(y - 32.7));
          ctx.lineTo(X(x1), Y(y - 32.7));
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#e4e2e8";
      const fit = (
        t: string,
        x0: number,
        x1: number,
        base: number,
        cap: number,
      ) => {
        ctx.save();
        ctx.font = `500 ${cap / 0.72}px Futura, "Century Gothic", "Avenir Next", Arial`;
        const w = ctx.measureText(t).width;
        ctx.translate(X(x0), Y(base - 32.7));
        ctx.scale((x1 - x0) / w, 1);
        ctx.fillText(t, 0, 0);
        ctx.restore();
      };
      fit("DOT MATRIX WITH STEREO SOUND", -12.47, 24.18, 57.23, 1.36);
      fit("BATTERY", -34.34, -26.51, 34.4, 1.4);
    },
    { dpmm: 26, roughness: 0.4 },
  );
  print.position.z = 0.02;
  print.rotation.x = 0;
  const pm = print.material as MeshStandardMaterial;
  pm.side = DoubleSide;
  g.add(print);
  return g;
}

/* ------------------------------ Screen gasket ---------------------------- */

/** Nintendo 21105: double-sided foam frame between the LCD and the window. */
export function buildGasket() {
  const s = roundedRectShape(57.6, 51.6, 1.2);
  s.holes.push(new Path(roundedRectShape(50.2, 45.8, 0.6).getPoints(8)));
  const g = new Group();
  g.add(
    new Mesh(
      extrude(s, 0.58, 0, 0.1, 1),
      new MeshStandardMaterial({ color: "#1d1d1f", roughness: 0.95 }),
    ),
  );
  return g;
}

/* ------------------------------ Guard plate ------------------------------ */

/** Nintendo 18417: mirror-finish steel sheet, local z = 0..0.3. */
export function buildGuardPlate() {
  const s = new Shape();
  // Main sheet with two top-corner tabs that ring the case-screw bosses.
  s.moveTo(-34.5, 17);
  s.lineTo(34.0, 17);
  s.lineTo(34.0, 51.0);
  s.lineTo(42.2, 51.0);
  s.lineTo(42.2, 61.0);
  s.lineTo(33.4, 61.0);
  s.lineTo(33.4, 71);
  s.lineTo(-33.4, 71);
  s.lineTo(-33.4, 61.0);
  s.lineTo(-42.2, 61.0);
  s.lineTo(-42.2, 51.0);
  s.lineTo(-34.5, 51.0);
  s.closePath();
  s.holes.push(circleHole(3.85, 37.47, 56.22), circleHole(3.85, -37.47, 56.22));
  for (const [x, y] of GUARD_SCREWS) s.holes.push(circleHole(1.1, x, y));
  const mirror = new MeshStandardMaterial({
    color: "#e4e7ea",
    roughness: 0.06,
    metalness: 1,
  });
  const g = new Group();
  g.add(new Mesh(extrude(s, 0.3, 0), mirror));
  // Pressed stiffening rib.
  g.add(new Mesh(box(56, 1.2, 0.3, -0.25, 64, 0.3), mirror));
  return g;
}

/* ------------------------------- Game Pak -------------------------------- */

const CART = { w: 57.0, h: 65.5, t: 7.6 };

/**
 * DMG Game Pak, label-view local frame: origin at the cartridge centre, label
 * face +Z, top +Y, x = u − 28.5 (u measured from the label-view left edge).
 */
export function buildCartridge() {
  const { w, h, t } = CART;
  const U = (u: number) => u - w / 2;
  const V = (v: number) => h / 2 - v;
  const s = new Shape();
  s.moveTo(U(1.0), V(h));
  s.lineTo(U(w - 1.0), V(h));
  s.quadraticCurveTo(U(w), V(h), U(w), V(h - 1.0));
  s.lineTo(U(w), V(2.9 + 1.0));
  s.quadraticCurveTo(U(w), V(2.9), U(w - 1.0), V(2.9));
  s.lineTo(U(51.8 + 0.5), V(2.9));
  s.quadraticCurveTo(U(51.8), V(2.9), U(51.8), V(2.4));
  s.lineTo(U(51.8), V(0));
  s.lineTo(U(1.5), V(0));
  s.quadraticCurveTo(U(0), V(0), U(0), V(1.5));
  s.lineTo(U(0), V(h - 1.0));
  s.quadraticCurveTo(U(0), V(h), U(1.0), V(h));
  let shell: BufferGeometry = extrude(s, t, -t / 2, 0.4, 2);
  // Front details: stadium recess, label recess, engraved arrow, side grips,
  // the shell seam and the connector mouth at the bottom.
  const stadium = roundedRectShape(
    50.1 - 5.5,
    15.6 - 3.2,
    6.2,
    U((5.5 + 50.1) / 2),
    V((3.2 + 15.6) / 2),
  );
  const labelRecess = roundedRectShape(
    49.7 - 6.0,
    56.6 - 17.7,
    1.0,
    U((6.0 + 49.7) / 2),
    V((17.7 + 56.6) / 2),
  );
  const arrow = new Shape();
  arrow.moveTo(U(23.4), V(58.2));
  arrow.lineTo(U(31.9), V(58.2));
  arrow.lineTo(U(27.7), V(63.0));
  arrow.closePath();
  // Five 0.8 × 0.6 grip grooves per side, running in from each side edge.
  const grips: BufferGeometry[] = [];
  for (const v of [5.1, 6.9, 8.8, 10.7, 12.6]) {
    grips.push(box(8.0, 0.8, 1.6, U(3.0), V(v), t / 2 + 0.2));
    grips.push(box(7.6, 0.8, 1.6, U(54.2), V(v), t / 2 + 0.2));
  }
  shell = subtract(
    shell,
    extrude(stadium, 1, t / 2 - 0.3),
    extrude(labelRecess, 1, t / 2 - 0.4),
    extrude(arrow, 1, t / 2 - 0.4),
  );
  shell = subtract(shell, merge(grips));
  shell = subtract(
    shell,
    // Shell seam 4.0 mm behind the label face.
    subtract(
      box(w + 2, h + 2, 0.35, 0, 0, t / 2 - 4.0),
      box(w - 0.6, h - 0.6, 1, 0, 0, t / 2 - 4.0),
    ),
    // Connector mouth: 50.6 wide × 3.0 at 2.0 behind the label face.
    box(50.6, 9, 3.0, U((3.2 + 53.8) / 2), V(h) + 4.0, t / 2 - 3.5),
  );
  const g = new Group();
  g.add(
    new Mesh(
      shell,
      new MeshStandardMaterial({ color: "#b4b1b1", roughness: 0.62 }),
    ),
  );

  // Edge-connector PCB inside the mouth with 32 gold pads.
  const pcb = new Mesh(
    box(49.3, 8.0, 0.8, U(28.5), V(h) + 1.0 + 4.0, t / 2 - 3.5),
    new MeshStandardMaterial({ color: "#2e7d4f", roughness: 0.5 }),
  );
  g.add(pcb);
  const pads: BufferGeometry[] = [];
  for (let i = 0; i < 32; i++) {
    const x = 23.25 - i * 1.5;
    const wide = i === 0 || i === 31;
    pads.push(
      box(
        wide ? 1.5 : 1.0,
        6.3,
        0.05,
        x,
        V(h) + 0.7 + 3.15,
        t / 2 - 3.5 + 0.42,
      ),
    );
  }
  g.add(new Mesh(merge(pads), M.gold()));

  // A generic test-cart label (original artwork, not a real game's label).
  const label = printDecal(43.0, 37.4, (ctx) => {
    const W = 43.0;
    const H = 37.4;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#2d6fcf");
    grd.addColorStop(1, "#1a4d9c");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9cdcb";
    ctx.fillRect(0, 0, 5.2, H);
    ctx.fillRect(W - 3.6, 0, 3.6, H);
    // Falling blocks.
    const cell = 2.6;
    const blocks: [number, number, string][] = [
      [10, 15, "#f2c94c"],
      [11, 15, "#f2c94c"],
      [12, 15, "#f2c94c"],
      [11, 14, "#f2c94c"],
      [14, 18, "#eb5757"],
      [15, 18, "#eb5757"],
      [15, 17, "#eb5757"],
      [16, 17, "#eb5757"],
      [8, 9, "#6fcf97"],
      [8, 10, "#6fcf97"],
      [8, 11, "#6fcf97"],
      [9, 11, "#6fcf97"],
      [3, 12, "#bb6bd9"],
      [4, 12, "#bb6bd9"],
      [3, 13, "#bb6bd9"],
      [4, 13, "#bb6bd9"],
    ];
    for (const [cx, cy, c] of blocks) {
      ctx.fillStyle = c;
      ctx.fillRect(cx * cell - 2, cy * cell - 18, cell - 0.25, cell - 0.25);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 5.4px Futura, Arial";
    ctx.fillText("BUILD", 7.5, 9.5);
    ctx.fillText("TEST", 7.5, 15.5);
    ctx.font = "600 1.8px Futura, Arial";
    ctx.fillStyle = "#dbe7ff";
    ctx.fillText("DMG-01 ASSEMBLY CHECK", 7.5, 19.2);
    ctx.save();
    ctx.translate(2.8, H - 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#4a4f55";
    ctx.font = "600 1.6px Arial";
    ctx.fillText("DMG-KIT-01   MADE ON A MAT", 0, 0);
    ctx.restore();
  });
  label.position.set(
    U((6.4 + 49.4) / 2),
    V((18.7 + 56.1) / 2),
    t / 2 - 0.4 + 0.12,
  );
  g.add(label);
  // Embossed "Nintendo GAME BOY™" in the stadium.
  const emb = printDecal(36, 4.5, (ctx) => {
    for (const [dx, dy, c] of [
      [-0.06, -0.06, "rgba(255,255,255,0.5)"],
      [0.06, 0.06, "rgba(60,55,55,0.38)"],
    ] as [number, number, string][]) {
      ctx.fillStyle = c;
      ctx.font = '700 2.3px "Arial Rounded MT Bold", Arial';
      ctx.fillText("Nintendo", 0.5 + dx, 3.4 + dy);
      ctx.font = "italic 800 4.2px Futura, Arial";
      ctx.fillText("GAME BOY", 11.5 + dx, 3.6 + dy);
      ctx.font = "700 1.2px Futura, Arial";
      ctx.fillText("TM", 33.5 + dx, 1.6 + dy);
    }
  });
  emb.position.set(U(28.15), V(10.45), t / 2 - 0.3 + 0.04);
  g.add(emb);
  // Tri-wing screw in its recess on the back.
  const recess = new Mesh(
    cylZ(3.0, 0.1, U(28.5), V(49.0), -t / 2 - 0.01, 32),
    new MeshStandardMaterial({ color: "#8f8c8c", roughness: 0.7 }),
  );
  g.add(recess);
  const head = new Mesh(
    cylZ(2.25, 0.4, U(28.5), V(49.0), -t / 2 + 0.05, 24),
    M.steel(),
  );
  g.add(head);
  return g;
}

export const CART_DIMS = CART;

/* --------------------------- DC/DC converter board ------------------------ */

/** "DC CONV DMG": 51 × 14 × 1.2 brown phenolic board, parts on +Z. */
export function buildDcDcBoard() {
  const g = new Group();
  g.add(
    buildBoard({
      outline: [
        [-25.5, 7],
        [25.5, 7],
        [25.5, -7],
        [-25.5, -7],
      ],
      holes: [],
      thickness: 1.2,
      frontColor: "#8b4a1c",
      backColor: "#7a3f18",
      edgeColor: "#a56a3a",
    }),
  );
  // Drum inductor "223", electrolytic, diodes, a green axial inductor, red dipped cap.
  const drum = new Mesh(
    merge([
      cylZ(4.75, 1.0, 0, 0, 0.5, 32),
      cylZ(3.4, 3.0, 0, 0, 2.5, 32),
      cylZ(4.75, 1.0, 0, 0, 4.5, 32),
    ]),
    new MeshStandardMaterial({
      color: "#3a3b3e",
      roughness: 0.5,
      metalness: 0.4,
    }),
  );
  drum.position.set(-12, 0.5, 0);
  g.add(drum);
  const winding = new Mesh(
    cylZ(3.6, 2.6, 0, 0, 2.5, 32),
    new MeshStandardMaterial({
      color: "#b06b2a",
      roughness: 0.4,
      metalness: 0.8,
    }),
  );
  winding.position.set(-12, 0.5, 0);
  g.add(winding);
  const cap = electrolytic(6.3, 6.0);
  cap.position.set(3, 0, 0);
  g.add(cap);
  for (const [x, y] of [
    [12, 3.5],
    [12, -3.5],
    [19, 0],
  ]) {
    const d = axial({
      length: 4.2,
      d: 2.4,
      pitch: 7.5,
      color: "#1c1c1c",
      bands: ["grey"],
      dir: 1,
    });
    d.position.set(x, y, 0);
    d.rotation.z = x === 19 ? Math.PI / 2 : 0;
    g.add(d);
  }
  const ind = axial({
    length: 3.8,
    d: 2.6,
    pitch: 7.5,
    color: "#3c8a4a",
    bands: ["red", "red", "brown"],
    dir: 1,
  });
  ind.position.set(-3, -4.5, 0);
  g.add(ind);
  const red = new Mesh(
    new CylinderGeometry(2.0, 2.0, 1.4, 20),
    new MeshStandardMaterial({ color: "#c0392b", roughness: 0.45 }),
  );
  red.position.set(-21, 3.5, 3.2);
  g.add(red);
  g.add(
    solderJoints(
      [
        [-21.5, -5],
        [-20, -5],
        [-18.5, -5],
        [-17, -5],
      ],
      -1.2,
      -1,
    ),
  );
  return g;
}

/* ---------------------------- Headphone-jack board ------------------------ */

/** DMG-JACK: 39 × 15 board with the 3.5 mm stereo jack, parts on +Z. */
export function buildJackBoard() {
  const g = new Group();
  g.add(
    buildBoard({
      outline: [
        [-19.5, 7.5],
        [19.5, 7.5],
        [19.5, -7.5],
        [-19.5, -7.5],
      ],
      holes: [
        { pos: [-8.0, -2.8], d: 2.2 },
        { pos: [8.7, -2.8], d: 2.2 },
      ],
      thickness: 1.2,
      frontColor: "#2f7a45",
      backColor: "#245e36",
    }),
  );
  // Jack body overhangs the bottom edge; barrel opens toward −Y.
  const jx = -1.5;
  // Mouth sits flush with the bottom wall (device y ≈ −73.6, axis z 7.4).
  let body: BufferGeometry = box(6.2, 11.4, 5.6, jx, -7.2, 2.8);
  const bore = new CylinderGeometry(1.8, 1.8, 14, 24);
  bore.translate(jx, -9, 2.8);
  body = subtract(body, bore);
  g.add(new Mesh(body, M.plasticBlack()));
  const sleeve = new CylinderGeometry(2.9, 2.9, 1.2, 28).translate(
    jx,
    -12.5,
    2.8,
  );
  g.add(
    new Mesh(
      subtract(
        sleeve,
        new CylinderGeometry(1.8, 1.8, 4, 24).translate(jx, -12.5, 2.8),
      ),
      M.plasticBlack(),
    ),
  );
  g.add(
    new Mesh(
      merge([
        box(0.4, 5, 3.4, jx - 2.6, -6, 2.6),
        box(0.4, 5, 3.4, jx + 2.6, -8, 2.6),
      ]),
      M.solder(),
    ),
  );
  // Coupling cap and resistors.
  const c = electrolytic(4, 5);
  c.position.set(12, 3, 0);
  g.add(c);
  for (const x of [-14, -10]) {
    const r = axial({
      length: 3.4,
      d: 1.8,
      pitch: 7.5,
      color: "#d9c3a0",
      bands: ["brown", "black", "orange", "gold"],
      dir: 1,
    });
    r.position.set(x, 2.5, 0);
    r.rotation.z = Math.PI / 2;
    g.add(r);
  }
  // Wire pads for the 4-wire harness at the left end.
  g.add(
    solderJoints(
      [
        [-17.5, 5],
        [-17.5, 2.5],
        [-17.5, 0],
        [-17.5, -2.5],
      ],
      0,
      1,
    ),
  );
  return g;
}
