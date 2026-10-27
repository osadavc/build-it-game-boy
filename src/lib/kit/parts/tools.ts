import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  Shape,
  Vector2,
} from "three";
import { merge } from "@/lib/three/csg";
import { M } from "../materials";
import type { ToolDef } from "../types";

/** Precision-driver body: tip at the origin, handle running up +Z. */
function driverBody(bit: Mesh, handleMat = M.handleBlack()) {
  const g = new Group();
  g.add(bit);
  // Hex-to-round steel shaft, Ø3 mm × 52 mm.
  const shaft = new Mesh(new CylinderGeometry(1.5, 1.5, 52, 24), M.steel());
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 3.2 + 26;
  g.add(shaft);
  // Ferrule.
  const ferrule = new Mesh(
    new LatheGeometry(
      [
        new Vector2(1.5, 0),
        new Vector2(3.4, 3),
        new Vector2(4.6, 7),
        new Vector2(4.6, 9),
      ],
      40,
    ),
    M.darkSteel(),
  );
  ferrule.rotation.x = Math.PI / 2;
  ferrule.position.z = 52;
  g.add(ferrule);
  // Fluted handle Ø12 × 70 mm with a swivel cap.
  const prof: Vector2[] = [];
  const pts: [number, number][] = [
    [4.6, 0],
    [5.6, 2],
    [6, 8],
    [6, 58],
    [5.6, 66],
    [4.4, 70],
  ];
  for (const [r, z] of pts) prof.push(new Vector2(r, z));
  const handle = new Mesh(new LatheGeometry(prof, 48), handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 61;
  g.add(handle);
  // Grip flutes.
  const flute = new CylinderGeometry(0.9, 0.9, 44, 10);
  const flutes = [];
  for (let i = 0; i < 8; i++) {
    const f = flute.clone();
    const a = (i / 8) * Math.PI * 2;
    f.translate(Math.cos(a) * 5.9, 0, Math.sin(a) * 5.9);
    flutes.push(f);
  }
  const fl = new Mesh(merge(flutes), M.handleRed());
  fl.rotation.x = Math.PI / 2;
  fl.position.z = 61 + 34;
  g.add(fl);
  const cap = new Mesh(new CylinderGeometry(4.2, 4.6, 4, 40), M.darkSteel());
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 61 + 72;
  g.add(cap);
  return g;
}

/** Tri-wing bit: three blades at 120°, each offset from the centre line. */
function triwingBit() {
  const blades = [];
  for (let i = 0; i < 3; i++) {
    const s = new Shape();
    // A wing 0.55 mm thick reaching 1.25 mm out, offset like a real tri-wing.
    s.moveTo(-0.28, -0.1);
    s.lineTo(0.28, -0.1);
    s.lineTo(0.22, 1.25);
    s.lineTo(-0.22, 1.25);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false });
    g.translate(0.14, 0, 0);
    g.rotateZ((i * Math.PI * 2) / 3);
    blades.push(g);
  }
  const core = new CylinderGeometry(0.4, 0.4, 3.2, 12);
  core.rotateX(Math.PI / 2);
  core.translate(0, 0, 1.6);
  const neck = new CylinderGeometry(1.5, 1.3, 1.2, 24);
  neck.rotateX(Math.PI / 2);
  neck.translate(0, 0, 3.2);
  return new Mesh(merge([...blades, core, neck]), M.steel());
}

/** Phillips #00: four fluted wings tapering to a point. */
function phillipsBit() {
  const wings = [];
  for (let i = 0; i < 4; i++) {
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(0.55, 0.35);
    s.lineTo(1.4, 2.6);
    s.lineTo(1.4, 3.2);
    s.lineTo(0, 3.2);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: false });
    g.translate(0, 0, -0.21);
    g.rotateX(-Math.PI / 2); // profile now lies in XZ, height along +Z
    g.rotateZ((i * Math.PI) / 2);
    wings.push(g);
  }
  const cone = new CylinderGeometry(0.75, 0.05, 2.6, 16);
  cone.rotateX(-Math.PI / 2);
  cone.translate(0, 0, 1.3);
  const neck = new CylinderGeometry(1.5, 1.4, 1, 24);
  neck.rotateX(Math.PI / 2);
  neck.translate(0, 0, 3.4);
  return new Mesh(merge([...wings, cone, neck]), M.steel());
}

function spudger() {
  const g = new Group();
  // Black nylon spudger: 150 mm, flat chisel at one end, hook at the other.
  const s = new Shape();
  s.moveTo(-1.6, 0);
  s.lineTo(1.6, 0);
  s.lineTo(4.8, 18);
  s.lineTo(4.8, 132);
  s.lineTo(2.6, 150);
  s.lineTo(-2.6, 150);
  s.lineTo(-4.8, 132);
  s.lineTo(-4.8, 18);
  s.closePath();
  const body = new ExtrudeGeometry(s, {
    depth: 2.4,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.6,
    bevelSegments: 2,
  });
  body.translate(0, 0, -1.2);
  body.rotateX(Math.PI / 2);
  const m = new Mesh(body, M.plasticBlack());
  m.rotation.x = -Math.PI / 2;
  g.add(m);
  return g;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    id: "triwing",
    name: "Tri-wing driver",
    tip: "Y1 bit",
    description:
      "Tri-wing (Y1) driver — Nintendo's security screws on the back case and in the battery bay.",
    build: () => driverBody(triwingBit()),
  },
  {
    id: "phillips",
    name: "Phillips driver",
    tip: "#00 bit",
    description:
      "Phillips #00 driver — the small screws that hold the LCD board and the CPU board.",
    build: () => driverBody(phillipsBit(), M.handleBlack()),
  },
  {
    id: "spudger",
    name: "Spudger",
    tip: "Nylon pry tool",
    description:
      "Anti-static nylon spudger — seats connectors and coaxes plastic clips without scratching.",
    build: spudger,
  },
];
