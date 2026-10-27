import {
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import { box, merge } from "@/lib/three/csg";
import { M } from "../materials";

/*
 * Nintendo 18441 speaker: 8 Ω mylar-cone, Ø28.9 × 5.0 mm. Local frame: axis
 * +Z (cone toward the grille), front lip at z = 0, rear at z = −5.
 */
const OD = 28.9;
const R = OD / 2;
const DEPTH = 5.0;
const LIP = 1.8;

const frameMat = new MeshStandardMaterial({
  color: "#1e1e1e",
  roughness: 0.55,
  side: DoubleSide,
});
const mylar = new MeshStandardMaterial({
  color: "#e8e4c8",
  roughness: 0.15,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  side: DoubleSide,
});
const coilMat = new MeshStandardMaterial({
  color: "#906b53",
  roughness: 0.4,
  metalness: 0.7,
  side: DoubleSide,
});
const capMat = new MeshStandardMaterial({
  color: "#bdbcb5",
  roughness: 0.32,
  metalness: 0.9,
});
const phenolic = new MeshStandardMaterial({ color: "#6b4a2b", roughness: 0.6 });

export function buildSpeaker() {
  const g = new Group();

  // Frame: front lip + side wall as one lathe.
  const prof = [
    new Vector2(R - LIP, -0.6),
    new Vector2(R - LIP, 0),
    new Vector2(R - 0.3, 0),
    new Vector2(R, -0.3),
    new Vector2(R, -DEPTH + 0.7),
    new Vector2(R - 0.6, -DEPTH + 0.7),
    new Vector2(R - 0.6, -0.6),
  ];
  const frame = new LatheGeometry(prof, 72);
  frame.rotateX(Math.PI / 2);
  g.add(new Mesh(frame, frameMat));

  // Perforated rear plate: 20 Ø1.5 vents on a Ø24.8 circle.
  const rear = new Shape();
  rear.absarc(0, 0, R - 0.3, 0, Math.PI * 2, false);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.08;
    const h = new Path();
    h.absarc(
      Math.cos(a) * 12.4,
      Math.sin(a) * 12.4,
      0.75,
      0,
      Math.PI * 2,
      true,
    );
    rear.holes.push(h);
  }
  const rp = new ExtrudeGeometry(rear, {
    depth: 0.7,
    bevelEnabled: false,
    curveSegments: 48,
  });
  rp.translate(0, 0, -DEPTH);
  g.add(new Mesh(rp, frameMat));

  // Clear mylar diaphragm with the copper voice coil visible through it.
  const dia: Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const r = (R - LIP + 0.2) * (1 - t);
    // Shallow cone that rises to a central dome.
    const z =
      -0.45 -
      0.9 * Math.sin(t * Math.PI * 0.5) +
      (t > 0.7 ? (t - 0.7) * 1.6 : 0);
    dia.push(new Vector2(r, z));
  }
  const diaphragm = new LatheGeometry(dia.reverse(), 64);
  diaphragm.rotateX(Math.PI / 2);
  const dm = new Mesh(diaphragm, mylar);
  dm.name = "noshadow";
  g.add(dm);
  // Corrugated surround rings.
  for (const r of [11.4, 10.6]) {
    const t = new TorusGeometry(r, 0.12, 6, 72);
    t.translate(0, 0, -0.55);
    const m = new Mesh(t, mylar);
    m.name = "noshadow";
    g.add(m);
  }
  const coil = new CylinderGeometry(4.2, 4.2, 2.2, 40, 1, true);
  coil.rotateX(Math.PI / 2);
  coil.translate(0, 0, -2.6);
  g.add(new Mesh(coil, coilMat));
  // Copper tinsel lead across the diaphragm.
  g.add(new Mesh(box(7.5, 0.25, 0.08, 7.8, 0.6, -1.25, 0.1), coilMat));

  // Magnet cup, almost flush on the rear.
  const cap = new CylinderGeometry(9.9, 9.9, 3.0, 64);
  cap.rotateX(Math.PI / 2);
  cap.translate(0, 0, -DEPTH - 0.8 + 1.5);
  g.add(new Mesh(cap, capMat));
  const bevel = new TorusGeometry(9.9, 0.35, 8, 64);
  bevel.translate(0, 0, -DEPTH + 0.05);
  g.add(new Mesh(bevel, frameMat));

  // Brown phenolic terminal strip on the rear rim with two tinned lugs.
  const strip = new Shape();
  const a0 = (-110 * Math.PI) / 180;
  const a1 = (-15 * Math.PI) / 180;
  strip.absarc(0, 0, R - 0.4, a0, a1, false);
  strip.absarc(0, 0, R - 4.2, a1, a0, true);
  const sg = new ExtrudeGeometry(strip, {
    depth: 0.6,
    bevelEnabled: false,
    curveSegments: 24,
  });
  sg.translate(0, 0, -DEPTH - 0.6);
  g.add(new Mesh(sg, phenolic));
  const lugs = [-25, -97].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return box(
      2.5,
      3,
      0.25,
      Math.cos(a) * 12.5,
      Math.sin(a) * 12.5,
      -DEPTH - 0.75,
      a + Math.PI / 2,
    );
  });
  g.add(new Mesh(merge(lugs), M.solder()));

  // Positioning tab that keys into the groove in the shell's speaker ring.
  g.add(new Mesh(box(2.4, 1.6, 1.2, -R - 0.5, 0, -2.2), frameMat));
  return g;
}

/** Lug positions in speaker-local coordinates (for the lead wires). */
export const SPEAKER_LUGS: [number, number, number][] = [-25, -97].map(
  (deg) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * 12.5, Math.sin(a) * 12.5, -DEPTH - 0.8];
  },
);

export const SPEAKER = { od: OD, depth: DEPTH };
