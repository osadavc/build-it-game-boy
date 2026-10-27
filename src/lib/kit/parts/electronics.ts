import {
  type BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  TorusGeometry,
} from "three";
import { printDecal } from "@/lib/three/canvas-texture";
import { box, cylZ, merge } from "@/lib/three/csg";
import { M } from "../materials";

/*
 * Generic electronic components. Every builder returns a Group whose local
 * origin sits on the board surface (z = 0) with the part rising along +Z.
 */

const geoCache = new Map<string, BufferGeometry>();
const cached = (key: string, make: () => BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};

function chamferedBody(l: number, w: number, h: number, standoff: number) {
  const c = Math.min(0.25, h * 0.2);
  return merge([
    box(l, w, h - c, 0, 0, standoff + (h - c) / 2),
    box(l - c * 2, w - c * 2, c, 0, 0, standoff + h - c / 2),
  ]);
}

function icLabel(
  w: number,
  h: number,
  lines: string[],
  pin1: [number, number] | null,
) {
  return printDecal(w, h, (ctx) => {
    ctx.fillStyle = "#cfcfcf";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size = Math.min(h / (lines.length + 1.4), (w / 10) * 1.6, 2.2);
    ctx.font = `600 ${size}px Arial, sans-serif`;
    lines.forEach((t, i) => {
      ctx.fillText(
        t,
        w / 2,
        h / 2 + (i - (lines.length - 1) / 2) * size * 1.25,
      );
    });
    if (pin1) {
      ctx.beginPath();
      ctx.fillStyle = "#3a3a3a";
      ctx.arc(pin1[0], pin1[1], Math.min(w, h) * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Quad flat package: leads on all four sides. */
export function qfp(opts: {
  bodyL: number;
  bodyW: number;
  bodyH?: number;
  pinsL: number;
  pinsW: number;
  pitch: number;
  span?: number;
  label?: string[];
}) {
  const { bodyL, bodyW, pinsL, pinsW, pitch } = opts;
  const bodyH = opts.bodyH ?? 2.7;
  const lead = ((opts.span ?? bodyL + 3.2) - bodyL) / 2;
  const key = `qfp:${bodyL}:${bodyW}:${pinsL}:${pinsW}:${pitch}:${lead}`;
  const leads = cached(key, () => {
    const parts: BufferGeometry[] = [];
    const lw = pitch * 0.42;
    const addRow = (n: number, along: "x" | "y", side: number) => {
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * pitch;
        const d = along === "x" ? bodyW / 2 : bodyL / 2;
        // Gull wing: out of the body, down, and a foot on the pad.
        const out = d + lead * 0.35;
        const foot = d + lead * 0.78;
        if (along === "x") {
          parts.push(box(lw, lead * 0.7, 0.15, o, side * out, 1.05));
          parts.push(box(lw, 0.15, 0.95, o, side * (d + lead * 0.6), 0.55));
          parts.push(box(lw, lead * 0.45, 0.15, o, side * foot, 0.08));
        } else {
          parts.push(box(lead * 0.7, lw, 0.15, side * out, o, 1.05));
          parts.push(box(0.15, lw, 0.95, side * (d + lead * 0.6), o, 0.55));
          parts.push(box(lead * 0.45, lw, 0.15, side * foot, o, 0.08));
        }
      }
    };
    addRow(pinsL, "x", 1);
    addRow(pinsL, "x", -1);
    addRow(pinsW, "y", 1);
    addRow(pinsW, "y", -1);
    return merge(parts);
  });
  const g = new Group();
  g.add(
    new Mesh(
      cached(`qfpbody:${bodyL}:${bodyW}:${bodyH}`, () =>
        chamferedBody(bodyL, bodyW, bodyH, 0.1),
      ),
      M.ic(),
    ),
  );
  g.add(new Mesh(leads, M.solder()));
  if (opts.label) {
    const d = icLabel(bodyL * 0.86, bodyW * 0.8, opts.label, [
      bodyL * 0.12,
      bodyW * 0.8 - bodyW * 0.12,
    ]);
    d.position.z = bodyH + 0.11;
    g.add(d);
  }
  return g;
}

/** Small-outline package (SOP/SOIC/SSOP): leads on the two long sides. */
export function sop(opts: {
  bodyL: number;
  bodyW: number;
  bodyH?: number;
  pinsPerSide: number;
  pitch: number;
  span?: number;
  label?: string[];
}) {
  const { bodyL, bodyW, pinsPerSide, pitch } = opts;
  const bodyH = opts.bodyH ?? 2.3;
  const lead = ((opts.span ?? bodyW + 2.6) - bodyW) / 2;
  const key = `sop:${bodyL}:${bodyW}:${pinsPerSide}:${pitch}:${lead}`;
  const leads = cached(key, () => {
    const parts: BufferGeometry[] = [];
    const lw = Math.min(0.45, pitch * 0.4);
    for (const side of [1, -1]) {
      for (let i = 0; i < pinsPerSide; i++) {
        const o = (i - (pinsPerSide - 1) / 2) * pitch;
        const d = bodyW / 2;
        parts.push(
          box(lw, lead * 0.6, 0.15, o, side * (d + lead * 0.3), bodyH * 0.42),
        );
        parts.push(
          box(lw, 0.15, bodyH * 0.42, o, side * (d + lead * 0.6), bodyH * 0.21),
        );
        parts.push(
          box(lw, lead * 0.42, 0.15, o, side * (d + lead * 0.8), 0.08),
        );
      }
    }
    return merge(parts);
  });
  const g = new Group();
  g.add(
    new Mesh(
      cached(`sopbody:${bodyL}:${bodyW}:${bodyH}`, () =>
        chamferedBody(bodyL, bodyW, bodyH, 0.12),
      ),
      M.ic(),
    ),
  );
  g.add(new Mesh(leads, M.solder()));
  if (opts.label) {
    const d = icLabel(bodyL * 0.9, bodyW * 0.8, opts.label, [
      bodyL * 0.08,
      bodyW * 0.8 * 0.82,
    ]);
    d.position.z = bodyH + 0.13;
    g.add(d);
  }
  return g;
}

/** SMD chip passive (0805/1206 …) with tinned end caps. */
export function chip(l: number, w: number, h: number, kind: "r" | "c") {
  const g = new Group();
  const end = Math.min(0.4, l * 0.2);
  g.add(
    new Mesh(
      cached(`chipbody:${l}:${w}:${h}`, () =>
        box(l - end * 2, w, h, 0, 0, h / 2),
      ),
      kind === "r" ? M.resistor() : M.ceramic(),
    ),
  );
  g.add(
    new Mesh(
      cached(`chipend:${l}:${w}:${h}`, () =>
        merge([
          box(end, w, h, l / 2 - end / 2, 0, h / 2),
          box(end, w, h, -l / 2 + end / 2, 0, h / 2),
        ]),
      ),
      M.solder(),
    ),
  );
  return g;
}

/** Radial aluminium electrolytic standing on the board. */
export function electrolytic(
  d: number,
  h: number,
  sleeve: "blue" | "black" = "black",
) {
  const g = new Group();
  const r = d / 2;
  const body = cached(`ecap:${d}:${h}`, () => {
    const c = new CylinderGeometry(r, r, h - 0.4, 32);
    c.rotateX(Math.PI / 2);
    c.translate(0, 0, (h - 0.4) / 2 + 0.3);
    // Rolled groove near the base.
    const t = new TorusGeometry(r * 0.98, 0.18, 6, 32);
    t.translate(0, 0, 1.0);
    return merge([c, t]);
  });
  g.add(new Mesh(body, sleeve === "blue" ? M.capBlue() : M.capBlack()));
  const top = cached(`ecaptop:${d}:${h}`, () =>
    cylZ(r * 0.92, 0.4, 0, 0, h - 0.1, 32),
  );
  g.add(new Mesh(top, M.capTop()));
  // Polarity stripe.
  const stripe = cached(`ecapstripe:${d}:${h}`, () => {
    const c = new CylinderGeometry(
      r + 0.02,
      r + 0.02,
      h - 1.2,
      16,
      1,
      true,
      0,
      0.9,
    );
    c.rotateX(Math.PI / 2);
    c.translate(0, 0, (h - 1.2) / 2 + 0.6);
    return c;
  });
  g.add(new Mesh(stripe, M.plasticWhite()));
  return g;
}

/** HC-49/S crystal can lying on the board. */
export function crystal(l = 11, w = 4.6, h = 3.5) {
  const g = new Group();
  const geo = cached(`xtal:${l}:${w}:${h}`, () => {
    const r = w / 2;
    const c1 = new CylinderGeometry(r, r, h, 24);
    c1.rotateX(Math.PI / 2);
    c1.translate(-(l / 2 - r), 0, h / 2);
    const c2 = c1.clone();
    c2.translate(2 * (l / 2 - r), 0, 0);
    return merge([box(l - w, w, h, 0, 0, h / 2), c1, c2]);
  });
  g.add(new Mesh(geo, M.nickel()));
  const base = cached(`xtalbase:${l}:${w}`, () =>
    box(l + 0.4, w + 0.4, 0.4, 0, 0, 0.2),
  );
  g.add(new Mesh(base, M.plasticBlack()));
  return g;
}

/** Bare PCB pad/footprint marks, flush on the board. */
export function pads(rects: [number, number, number, number][]) {
  return new Mesh(
    merge(rects.map(([x, y, w, h]) => box(w, h, 0.05, x, y, 0.025))),
    M.solder(),
  );
}
