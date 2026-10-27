import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { SLOT_BY_ID } from "@/lib/kit/data";
import { sceneRefs } from "./registry";

const local = new Map<string, Matrix4>();

export function slotLocalMatrix(slotId: string) {
  let m = local.get(slotId);
  if (!m) {
    const s = SLOT_BY_ID[slotId];
    m = new Matrix4().compose(
      new Vector3(...s.position),
      new Quaternion().setFromEuler(new Euler(...(s.rotation ?? [0, 0, 0]))),
      new Vector3(1, 1, 1),
    );
    local.set(slotId, m);
  }
  return m;
}

const tmp = new Matrix4();
const scl = new Vector3();

/** World transform of a slot given its assembly group's current pose. */
export function slotWorld(
  slotId: string,
  outPos: Vector3,
  outQuat: Quaternion,
  extraLocal?: Vector3,
) {
  const s = SLOT_BY_ID[slotId];
  const g = sceneRefs.groups[s.group];
  tmp.copy(slotLocalMatrix(slotId));
  if (extraLocal) {
    // Offset in the group's (device) frame, e.g. hover distance along approach.
    tmp.elements[12] += extraLocal.x;
    tmp.elements[13] += extraLocal.y;
    tmp.elements[14] += extraLocal.z;
  }
  if (g) tmp.premultiply(g.matrixWorld);
  tmp.decompose(outPos, outQuat, scl);
}

export function approachOf(slotId: string) {
  const a = SLOT_BY_ID[slotId].approach ?? [0, 0, -1];
  return new Vector3(...a).normalize();
}

/**
 * How far above its seat a part waits while it's held over the right spot.
 * Plastic and boards sit just proud of the seat and settle straight in on
 * release; screws wait at the mouth of the hole to be driven down, and the
 * cartridge waits above its slot to be slid in.
 */
export function previewLift(slotId: string) {
  const s = SLOT_BY_ID[slotId];
  return s.spin || s.slide ? (s.hover ?? 9) : 1.5;
}
