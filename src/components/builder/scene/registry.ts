import type { CameraControls } from "@react-three/drei";
import { type Group, Quaternion, Vector3 } from "three";
import type { GroupId } from "@/lib/kit/types";

/** Mutable, render-free handles shared between the DOM and the R3F scene. */
export const sceneRefs: {
  groups: Record<GroupId, Group | null>;
  controls: CameraControls | null;
  canvas: HTMLElement | null;
} = {
  groups: { front: null, back: null },
  controls: null,
  canvas: null,
};

/** Double-clicking a part centres the view on that spot and moves in a little. */
export function focusPoint(p: Vector3) {
  const c = sceneRefs.controls;
  if (!c) return;
  void c.moveTo(p.x, p.y, p.z, true);
  void c.dollyTo(Math.min(c.distance, 170), true);
}

export const pointer = { x: 0, y: 0, inCanvas: false };

/** Written by the in-canvas drag controller every frame, read on drop. */
export const dragRuntime = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  /** Where the part would rest on the mat under the cursor. */
  ground: new Vector3(),
  snapped: null as string | null,
  active: false,
};

export function updatePointer(x: number, y: number) {
  pointer.x = x;
  pointer.y = y;
  // The canvas fills the window, so "over the stage" means nothing else sits
  // on top of it at this point (the card, dock and sheet all count as UI).
  const el = sceneRefs.canvas;
  pointer.inCanvas = !!el && document.elementFromPoint(x, y) === el;
}
