import {
  type BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mmCanvasTexture, spacedText } from "@/lib/three/canvas-texture";
import { box, cylZ, extrude, merge } from "@/lib/three/csg";
import { polygonShape } from "@/lib/three/shapes";
import { M } from "../materials";

/** Spherical cap with base radius `r` and rise `h`, base at y = 0, rising +Y. */
export function domeCap(r: number, h: number, seg = 24) {
  const R = (r * r + h * h) / (2 * h);
  const theta = Math.asin(Math.min(1, r / R));
  const g = new SphereGeometry(
    R,
    seg,
    Math.max(4, seg / 3),
    0,
    Math.PI * 2,
    0,
    theta,
  );
  g.translate(0, -(R - h), 0);
  return g;
}

/* ----------------------------- AA cell -------------------------------- */

type Profile = [number, number][];

/** Quarter-round from `a` to `b` around `c`, without the start point. */
function arc(c: [number, number], r: number, a0: number, a1: number, n = 5) {
  const pts: Profile = [];
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return pts;
}

/**
 * Lathe a profile (ordered so the outside is on the right). A point listed
 * twice becomes a hard edge: three's lathe gives the zero-length segment no
 * weight, so each side keeps its own normal.
 */
function lathe(profile: Profile, seg = 64) {
  return new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    seg,
  );
}

/**
 * IEC LR6 cell, Ø14.4 × 50.5 mm over the nub. Axis along +Y, positive nub at
 * +Y. The printed shrink-wrap rolls over both shoulders; the steel can top
 * and the flat negative cap show through the openings.
 */
export function buildBattery() {
  const g = new Group();
  const L = 50.5;
  const r = 7.2;
  const top = L / 2; // nub tip
  const bottom = -L / 2; // negative cap face
  const wrapTop = top - 1.1; // the wrap's rolled shoulder at (+)
  const wrapBottom = bottom + 0.2; // ... and at (−); the cap stands proud
  const fold = 0.7;

  // Shrink-wrap: inner lip, shoulder roll, side, shoulder roll, inner lip.
  const wrapGeo = lathe([
    [5.3, bottom + 0.55],
    [5.3, wrapBottom],
    [5.3, wrapBottom],
    [r - fold, wrapBottom],
    ...arc([r - fold, wrapBottom + fold], fold, -Math.PI / 2, 0),
    [r, wrapTop - fold],
    ...arc([r - fold, wrapTop - fold], fold, 0, Math.PI / 2),
    [6.0, wrapTop],
    [6.0, wrapTop],
    [6.0, wrapTop - 0.35],
  ]);
  // Map the label along the length (the lathe's own v follows point index).
  const pos = wrapGeo.attributes.position;
  const uv = wrapGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setY(i, (pos.getY(i) - wrapBottom) / (wrapTop - wrapBottom));
  const { map, metalnessMap } = batteryWrap(
    2 * Math.PI * r,
    wrapTop - wrapBottom,
  );
  g.add(
    new Mesh(
      wrapGeo,
      new MeshStandardMaterial({
        map,
        metalnessMap,
        metalness: 1,
        roughness: 0.3,
      }),
    ),
  );

  // Positive end: bare can top inside the wrap, and the nub.
  const nubR = 2.7;
  const can = wrapTop - 0.12;
  g.add(
    new Mesh(
      lathe([
        [6.1, can - 0.4],
        [6.1, can],
        [6.1, can],
        [nubR + 0.25, can],
        ...arc([nubR + 0.25, can + 0.25], 0.25, -Math.PI / 2, -Math.PI, 3),
        [nubR, top - 0.3],
        ...arc([nubR - 0.3, top - 0.3], 0.3, 0, Math.PI / 2, 4),
        [0, top],
      ]),
      M.nickel(),
    ),
  );
  // Negative end: flat steel cap, slightly domed edge.
  g.add(
    new Mesh(
      lathe([
        [0, bottom],
        [4.9, bottom],
        ...arc([4.9, bottom + 0.3], 0.3, -Math.PI / 2, 0, 4),
        [5.2, bottom + 0.6],
      ]),
      M.nickel(),
    ),
  );
  return g;
}

/**
 * The cell's printed wrap, `w` mm around × `h` mm along (top = + end). The
 * print repeats on opposite sides so it reads whichever way the cell lies;
 * the band at the + end is bare metallic film (white in the metalness map).
 */
function batteryWrap(w: number, h: number) {
  const band = 13;
  const map = mmCanvasTexture(w, h, (ctx) => {
    ctx.fillStyle = "#1d1f24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b4b7bc";
    ctx.fillRect(0, 0, w, band);
    ctx.fillStyle = "#8d2b3b";
    ctx.fillRect(0, band, w, 0.9);
    for (const cx of [0, w / 2, w]) {
      // Text runs along the axis, reading from the (−) end to the (+) end.
      ctx.save();
      ctx.translate(cx, (h + band) / 2 - 1.2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f1efe9";
      ctx.font = "700 4.6px Arial, Helvetica, sans-serif";
      spacedText(ctx, "ALKALINE", 0, -1.2, 0.35, "center");
      ctx.fillStyle = "#a9abb1";
      ctx.font = "500 2.1px Arial, Helvetica, sans-serif";
      spacedText(ctx, "AA  ·  LR6  ·  1.5 V", 0, 2.6, 0.12, "center");
      ctx.restore();
      ctx.save();
      ctx.translate(cx, band / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#26282d";
      ctx.font = "700 5px Arial, Helvetica, sans-serif";
      ctx.fillText("+", 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(cx, h - 1.9);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#a9abb1";
      ctx.font = "700 4px Arial, Helvetica, sans-serif";
      ctx.fillText("−", 0, 0);
      ctx.restore();
    }
  });
  const metalnessMap = mmCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e6e6e6";
      ctx.fillRect(0, 0, w, band);
    },
    4,
  );
  return { map, metalnessMap };
}

/* ------------------------- Battery bridge contact ---------------------- */

export function springGeometry(
  od: number,
  wire: number,
  turns: number,
  length: number,
) {
  const pts: Vector3[] = [];
  const r = od / 2 - wire / 2;
  const steps = turns * 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    // Closed (flat) end coils, conical base coil.
    const rr = t < 0.12 ? r + (0.12 - t) * 4 : r;
    pts.push(new Vector3(Math.cos(a) * rr, t * length, Math.sin(a) * rr));
  }
  return new TubeGeometry(
    new CatmullRomCurve3(pts),
    steps * 2,
    wire / 2,
    6,
    false,
  );
}

/**
 * Nintendo 18413/18414 bridge contact: chamfered 28 × 11 × 0.3 mm plate with
 * a coil spring at −7.25 mm and a dome dimple at +7.25 mm. The plate lies in
 * the XZ plane; spring and dimple point along +Y.
 */
export function buildBridgeContact() {
  const g = new Group();
  const plate = extrude(
    polygonShape(
      [
        [-14, -5.5],
        [14, -5.5],
        [14, 5.5],
        [-14, 5.5],
      ],
      [2.5, 2.5, 2.5, 2.5],
    ),
    0.3,
    -0.15,
  );
  plate.rotateX(Math.PI / 2); // shape XY -> XZ, thickness along Y
  g.add(new Mesh(plate, M.nickel()));
  const dimple = domeCap(2.5, 0.9);
  dimple.translate(7.25, 0.15, 0);
  g.add(new Mesh(dimple, M.nickel()));
  const spring = springGeometry(6.0, 0.5, 6, 4.6);
  spring.translate(-7.25, 0.15, 0);
  g.add(new Mesh(spring, M.nickel()));
  // Retention lances at the short ends.
  g.add(
    new Mesh(
      merge([box(0.6, 0.5, 3, -13.6, 0.3, 0), box(0.6, 0.5, 3, 13.6, 0.3, 0)]),
      M.nickel(),
    ),
  );
  return g;
}

/** Spring-on-bracket and flat-plate pack terminals soldered to the CPU board. */
export function buildPackTerminals() {
  const g = new Group();
  // "+" plate at device x = −21.75, "−" spring at +21.75 (in CPU-board space
  // these hang off the bottom edge; positioned by the CPU board builder).
  const plate = box(8.5, 0.3, 10, -21.75, 0, 0);
  const dimple = domeCap(2.25, 0.8);
  dimple.rotateX(Math.PI);
  dimple.translate(-21.75, -0.15, 0);
  g.add(new Mesh(merge([plate, dimple]), M.nickel()));
  const spring = springGeometry(6.2, 0.5, 6, 6.4);
  spring.rotateX(Math.PI);
  spring.translate(21.75, -0.2, 0);
  g.add(new Mesh(spring, M.nickel()));
  g.add(new Mesh(box(8, 0.3, 9, 21.75, 0, 0), M.nickel()));
  return g;
}

/* --------------------------- Power-switch slider ----------------------- */

/**
 * Nintendo 18409 power-switch actuator (ABS, #5a5a64). Local origin = slider
 * centre; maps to the device by translation only. Knob rises +Y through the
 * top wall; the cartridge-lock tongue projects −Z into the cartridge bay.
 */
export function buildPowerSlider() {
  const mat = new MeshStandardMaterial({ color: "#5a5a64", roughness: 0.55 });
  const parts: BufferGeometry[] = [];
  // Carrier plate 18.05 × 8.6, 1.5 thick (Y 0…1.5), with end notches.
  parts.push(box(18.05 - 2.7, 1.5, 8.6, 0, 0.75, 0));
  parts.push(box(1.35, 1.5, 8.6 - 3.3, 8.35, 0.75, -1.65));
  parts.push(box(1.35, 1.5, 8.6 - 3.3, -8.35, 0.75, -1.65));
  // Rear / front flanges.
  parts.push(box(18.05, 2.775, 1.73, 0, 0.24, -3.435));
  parts.push(box(18.05, 1.75, 1.2, 0, 0.75, 3.7));
  // Domed knob 5 × 5, sides to Y 4.3, dome to 5.0.
  parts.push(box(5, 2.8, 5, 0, 2.9, 0));
  const dome = domeCap(2.5, 0.7);
  dome.translate(0, 4.3, 0);
  parts.push(dome);
  // Fork prongs gripping the electrical switch's nub.
  parts.push(box(1.25, 2.15, 4.7, -2.875, -1.075, -0.65));
  parts.push(box(1.25, 2.15, 4.7, 2.875, -1.075, -0.65));
  // Detent pins.
  for (const x of [-4.76, 4.76]) {
    const p = new CylinderGeometry(0.77, 0.77, 1.4, 16);
    p.translate(x, -0.7, 0);
    parts.push(p);
  }
  // Cartridge-lock tongue with chamfered tip.
  parts.push(box(7.65, 1.4, 5.9, -1.1, -0.4, -7.35));
  const g = new Group();
  g.add(new Mesh(merge(parts), mat));
  return g;
}

/** Power LED body — kept here so the LCD board can import it. */
export function ledGeometry() {
  return merge([
    cylZ(1.5, 3.6, 0, 0, 2.2, 24),
    cylZ(1.9, 0.9, 0, 0, 0.45, 24),
    (() => {
      const s = new SphereGeometry(1.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      s.rotateX(Math.PI / 2);
      s.translate(0, 0, 4.0);
      return s;
    })(),
  ]);
}
