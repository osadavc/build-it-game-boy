import type { GroupId, PoseId, Vec3 } from "../types";

const PI = Math.PI;

/** World positions of the two halves while the case is open like a book. */
export const LAYOUT = {
  /** Front half lies face-down nearest the viewer, top edge pointing away. */
  frontOpen: [0, 16, 84] as Vec3,
  /** Rear half lies interior-up beyond it, top edges facing across a 20 mm gap. */
  backOpen: [0, 16, -84] as Vec3,
  center: [0, 16, 0] as Vec3,
};

type PoseTable = Record<
  PoseId,
  Record<GroupId, { position: Vec3; rotation: Vec3 }>
>;

// Rotations are euler XYZ applied to the device frame:
//  face-down, top away  -> (π/2, 0, π)
//  interior-up, top toward viewer -> (π/2, π, 0)
//  face-up, top away    -> (-π/2, 0, 0)
const faceDownTopAway: Vec3 = [PI / 2, 0, PI];
const interiorUpTopNear: Vec3 = [PI / 2, PI, 0];
const faceUpTopAway: Vec3 = [-PI / 2, 0, 0];
const upright: Vec3 = [-0.14, 0.32, 0];

const both = (position: Vec3, rotation: Vec3) => ({
  front: { position, rotation },
  back: { position, rotation },
});

export const POSES: PoseTable = {
  open: {
    front: { position: LAYOUT.frontOpen, rotation: faceDownTopAway },
    back: { position: LAYOUT.backOpen, rotation: interiorUpTopNear },
  },
  // Front half hinged over the top edge onto the rear half.
  closed: both(LAYOUT.backOpen, interiorUpTopNear),
  "back-up": both(LAYOUT.center, faceDownTopAway),
  "front-up": both(LAYOUT.center, faceUpTopAway),
  upright: both([0, 76.5, 0], upright),
};
