import { Euler, Matrix4, Vector3 } from "three";
import {
  BACK_SCREW_SEAT_Z,
  BAY_SCREW_SEAT_Z,
  CASE_SCREWS_BACK,
  CASE_SCREWS_BAY,
  GUARD_SCREWS,
  GUARD_Z,
} from "../parts/back-shell";
import { CELL_Z, CPU_PLACEMENT } from "../parts/cpu-board";
import { PHILLIPS_SPEC, TRIWING_SPEC } from "../parts/fasteners";
import { LCD_PLACEMENT, LCD_SCREW_HOLES, LCD_T } from "../parts/lcd-board";
import type { SlotDef, Vec3 } from "../types";

const PI = Math.PI;
const deg = (d: number) => (d * PI) / 180;

/*
 * Stack-up (device Z, mm). Front face +16.125, back face −16.125 (measured
 * CAD convention). LCD board front face +7.475, 1.6 mm thick.
 */
export const Z = {
  front: 16.125,
  back: -16.125,
  frontInner: 13.725,
  lensFloor: 15.125,
  lcdFront: LCD_PLACEMENT.z,
  lcdRear: LCD_PLACEMENT.z - LCD_T,
  cpuFront: CPU_PLACEMENT.z,
  guard: GUARD_Z,
  cell: CELL_Z,
};

// Screw slot origin = head top. Position given = head bearing face, axis = insertion direction.
const screwSlot = (
  id: string,
  part: "screw-triwing" | "screw-phillips",
  bearing: Vec3,
  axis: 1 | -1,
  group: "front" | "back",
): SlotDef => {
  const h = part === "screw-triwing" ? TRIWING_SPEC.headH : PHILLIPS_SPEC.headH;
  return {
    id,
    part,
    group,
    position: [bearing[0], bearing[1], bearing[2] - axis * h],
    rotation: axis === 1 ? [PI, 0, 0] : [0, 0, 0],
    approach: [0, 0, axis],
    hover: 9,
    tool: part === "screw-triwing" ? "triwing" : "phillips",
    spin: 5,
  };
};

const LCD_SCREWS = LCD_SCREW_HOLES.map(
  ([x, y]) => [x + LCD_PLACEMENT.x, y + LCD_PLACEMENT.y] as [number, number],
);

const CASE_SCREWS: Vec3[] = [
  ...CASE_SCREWS_BACK.map(([x, y]) => [x, y, BACK_SCREW_SEAT_Z] as Vec3),
  ...CASE_SCREWS_BAY.map(([x, y]) => [x, y, BAY_SCREW_SEAT_Z] as Vec3),
];

/** Euler rotation whose local X/Y/Z axes land on the given device axes. */
const basis = (x: Vec3, y: Vec3, z: Vec3): Vec3 => {
  const e = new Euler().setFromRotationMatrix(
    new Matrix4().makeBasis(
      new Vector3(...x),
      new Vector3(...y),
      new Vector3(...z),
    ),
  );
  return [e.x, e.y, e.z];
};

export const SLOTS: SlotDef[] = [
  /* ------------------------------ front half ----------------------------- */
  {
    id: "front-shell",
    part: "front-shell",
    group: "front",
    position: [0, 0, 0],
    approach: [0, 0, 1],
    hover: 30,
  },
  {
    id: "dpad",
    part: "dpad",
    group: "front",
    position: [-26.0, -26.5, 13.66],
    approach: [0, 0, 1],
    hover: 14,
  },
  {
    id: "btn-a",
    part: "ab-button",
    group: "front",
    position: [32.12, -21.87, 11.125],
    approach: [0, 0, 1],
    hover: 14,
  },
  {
    id: "btn-b",
    part: "ab-button",
    group: "front",
    position: [17.62, -28.62, 11.125],
    approach: [0, 0, 1],
    hover: 14,
  },
  {
    id: "rubber-dpad",
    part: "rubber-dpad",
    group: "front",
    position: [-26.0, -26.5, Z.lcdFront + 0.05],
    approach: [0, 0, 1],
    hover: 12,
  },
  {
    id: "rubber-ab",
    part: "rubber-ab",
    group: "front",
    position: [24.87, -25.245, Z.lcdFront + 0.05],
    rotation: [0, 0, deg(25)],
    approach: [0, 0, 1],
    hover: 12,
  },
  {
    id: "rubber-ss",
    part: "start-select",
    group: "front",
    position: [-4.375, -48.3, Z.lcdFront + 0.05],
    approach: [0, 0, 1],
    hover: 12,
  },
  {
    id: "gasket",
    part: "gasket",
    group: "front",
    position: [0, 32.85, 12.5],
    approach: [0, 0, 1],
    hover: 12,
  },
  {
    id: "speaker",
    part: "speaker",
    group: "front",
    position: [24.6, -53.6, Z.frontInner - 0.04],
    approach: [0, 0, 1],
    hover: 14,
  },
  {
    id: "lcd-board",
    part: "lcd-board",
    group: "front",
    position: [LCD_PLACEMENT.x, LCD_PLACEMENT.y, Z.lcdFront],
    approach: [0, 0, 1],
    hover: 22,
  },
  ...LCD_SCREWS.map(([x, y], i) =>
    screwSlot(
      `lcd-screw-${i + 1}`,
      "screw-phillips",
      [x, y, Z.lcdRear],
      1,
      "front",
    ),
  ),
  /* ------------------------------ rear half ------------------------------ */
  {
    id: "back-shell",
    part: "back-shell",
    group: "back",
    position: [0, 0, 0],
    approach: [0, 0, -1],
    hover: 30,
  },
  {
    id: "guard-plate",
    part: "guard-plate",
    group: "back",
    position: [0, 0, Z.guard],
    approach: [0, 0, -1],
    hover: 16,
  },
  ...GUARD_SCREWS.map(([x, y], i) =>
    screwSlot(
      `guard-screw-${i + 1}`,
      "screw-phillips",
      [x, y, Z.guard + 0.3],
      -1,
      "back",
    ),
  ),
  {
    id: "power-actuator",
    part: "power-actuator",
    group: "back",
    position: [-31.85, 70.2, 0.45],
    approach: [0, 0, -1],
    hover: 12,
  },
  {
    id: "cpu-board",
    part: "cpu-board",
    group: "back",
    position: [CPU_PLACEMENT.x, CPU_PLACEMENT.y, CPU_PLACEMENT.z],
    approach: [0, 0, -1],
    hover: 22,
  },
  {
    id: "dcdc-board",
    part: "dcdc-board",
    group: "back",
    position: [-38.5, -37.5, -5.5],
    rotation: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]),
    approach: [0, 0, -1],
    hover: 16,
  },
  ...[
    [30.2 + CPU_PLACEMENT.x, -30.0 + CPU_PLACEMENT.y],
    [-31.5 + CPU_PLACEMENT.x, -30.0 + CPU_PLACEMENT.y],
  ].map(([x, y], i) =>
    screwSlot(
      `cpu-screw-${i + 1}`,
      "screw-phillips",
      [x, y, Z.cpuFront],
      -1,
      "back",
    ),
  ),
  {
    id: "jack-board",
    part: "jack-board",
    group: "back",
    position: [-0.5, -60.5, 4.6],
    approach: [0, 0, -1],
    hover: 14,
  },
  ...[
    [-8.5, -63.3],
    [8.2, -63.3],
  ].map(([x, y], i) =>
    screwSlot(`jack-screw-${i + 1}`, "screw-phillips", [x, y, 4.6], -1, "back"),
  ),
  ...CASE_SCREWS.map((p, i) =>
    screwSlot(`case-screw-${i + 1}`, "screw-triwing", p, 1, "back"),
  ),
  {
    id: "contact-w1",
    part: "bridge-contact",
    group: "back",
    position: [0, -12.33, Z.cell],
    rotation: [PI, 0, 0],
    approach: [0, 0, 1],
    hover: 16,
  },
  {
    id: "contact-w2a",
    part: "bridge-contact",
    group: "back",
    position: [-14.5, -67.23, Z.cell],
    approach: [0, 0, 1],
    hover: 16,
  },
  {
    id: "contact-w2b",
    part: "bridge-contact",
    group: "back",
    position: [14.5, -67.23, Z.cell],
    approach: [0, 0, 1],
    hover: 16,
  },
  ...[
    [-21.75, -38.35, 0],
    [-7.25, -41.2, PI],
    [7.25, -38.35, 0],
    [21.75, -41.2, PI],
  ].map(
    ([x, y, rz], i): SlotDef => ({
      id: `battery-${i + 1}`,
      part: "aa-battery",
      group: "back",
      position: [x, y, Z.cell],
      rotation: [0, 0, rz],
      approach: [0, 0, 1],
      hover: 24,
    }),
  ),
  {
    id: "battery-cover",
    part: "battery-cover",
    group: "back",
    position: [0, 0, 0],
    approach: [0, 0, 1],
    hover: 18,
  },
  {
    id: "lens",
    part: "lens",
    group: "front",
    position: [0, 32.7, Z.lensFloor + 0.06],
    approach: [0, 0, -1],
    hover: 16,
  },
  {
    id: "cartridge",
    part: "cartridge",
    group: "back",
    // Label faces the back; seated top 2.7 mm below the device top.
    position: [0, (71.3 + 5.8) / 2, (-14.825 + -7.225) / 2],
    rotation: [0, PI, 0],
    approach: [0, -1, 0],
    // Held with its connector edge just started in the slot mouth (device
    // top at 74, cartridge bottom edge 5.8 when seated), then slid home.
    hover: 64,
    slide: true,
  },
];
