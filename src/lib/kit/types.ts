import type { Object3D } from "three";

/** Millimetres. Device frame: origin = centre of the closed DMG-01, +X right
 * (seen from the front), +Y toward the cartridge end, +Z out of the screen. */
export type Vec3 = [number, number, number];

export type PartCategory =
  | "Housing"
  | "Display"
  | "Boards"
  | "Controls"
  | "Audio"
  | "Power"
  | "Fasteners"
  | "Extras";

export type ToolId = "triwing" | "phillips" | "spudger";

export interface ToolDef {
  id: ToolId;
  name: string;
  tip: string;
  description: string;
  build: () => Object3D;
}

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  qty: number;
  /** Manufacturer marking / revision, e.g. "DMG-CPU-06". */
  marking?: string;
  /** Short line under the name, e.g. "Tri-wing · Ø2.6 × 8 mm". */
  spec: string;
  /** Key dimensions + material rows shown in the detail popover. */
  facts: [label: string, value: string][];
  description: string;
  /** Builds the part in its own local frame (mm). */
  build: () => Object3D;
  /** Rotation (euler XYZ, rad) applied when the part lies loose on the mat. */
  rest?: Vec3;
  /** Camera direction (part-local) for the tray thumbnail. */
  thumbView?: Vec3;
}

export type GroupId = "front" | "back";

export interface SlotDef {
  id: string;
  part: string;
  group: GroupId;
  /** Device-frame position of the part's local origin when installed. */
  position: Vec3;
  /** Device-frame euler rotation (XYZ, radians). */
  rotation?: Vec3;
  /** Unit vector (device frame) the part travels along as it seats. */
  approach?: Vec3;
  /** Distance it hovers before seating. */
  hover?: number;
  tool?: ToolId;
  /** Screws spin while being driven. */
  spin?: number;
  /** Slides in along `approach` from `hover` away, like a cartridge into its slot. */
  slide?: boolean;
  label?: string;
}

export type PoseId = "open" | "closed" | "back-up" | "front-up" | "upright";

export type StepAction = "ribbon" | "close" | "flip" | "power";

export interface Bullet {
  tone: "info" | "caution" | "note";
  text: string;
}

export interface StepDef {
  id: string;
  title: string;
  bullets: Bullet[];
  slots: string[];
  tool?: ToolId;
  action?: { kind: StepAction; label: string };
  pose: PoseId;
  /**
   * Which half the step works on, the world direction the camera views it
   * from, and how far back it sits. The orbit centre is always the middle of
   * that half (or of the whole device once it's closed).
   */
  view: { group: GroupId | "both"; dir: Vec3; dist: number };
  /** Which half the step works on, for focusing UI. */
  focus?: GroupId | "both";
}
