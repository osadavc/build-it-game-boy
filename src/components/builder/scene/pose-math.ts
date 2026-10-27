import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Vec3 } from "@/lib/kit/types";

export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}

export const poseFrom = (position: Vec3, rotation: Vec3): Pose => ({
  position: new Vector3(...position),
  quaternion: new Quaternion().setFromEuler(new Euler(...rotation)),
});

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const qRel = new Quaternion();
const qStep = new Quaternion();
const axis = new Vector3();
const u = new Vector3();
const v = new Vector3();
const b = new Vector3();
const rot = new Matrix4();
const pivot = new Vector3();
const off = new Vector3();

/**
 * Rotates rigidly about the single hinge line that carries `from` onto `to`
 * (like closing a book). Falls back to a lerp/slerp for tiny rotations.
 */
export function hingeLerp(
  from: Pose,
  to: Pose,
  t: number,
  outP: Vector3,
  outQ: Quaternion,
) {
  qRel.copy(to.quaternion).multiply(from.quaternion.clone().invert());
  if (qRel.w < 0) qRel.set(-qRel.x, -qRel.y, -qRel.z, -qRel.w);
  const angle = 2 * Math.acos(Math.min(1, qRel.w));
  if (angle < 1e-3) {
    outP.lerpVectors(from.position, to.position, t);
    outQ.slerpQuaternions(from.quaternion, to.quaternion, t);
    return;
  }
  axis.set(qRel.x, qRel.y, qRel.z).normalize();
  hingeSolve(from, to, angle, t, outP, outQ);
  // A half-turn can swing either way round the hinge; take the arc that
  // passes above the mat rather than through it.
  if (angle > Math.PI * 0.9) {
    const midA = new Vector3();
    hingeSolve(from, to, angle, 0.5, midA, new Quaternion());
    axis.negate();
    const midB = new Vector3();
    hingeSolve(from, to, Math.PI * 2 - angle, 0.5, midB, new Quaternion());
    if (midB.y > midA.y) {
      hingeSolve(from, to, Math.PI * 2 - angle, t, outP, outQ);
    } else {
      axis.negate();
      hingeSolve(from, to, angle, t, outP, outQ);
    }
  }
}

function hingeSolve(
  from: Pose,
  to: Pose,
  angle: number,
  t: number,
  outP: Vector3,
  outQ: Quaternion,
) {
  u.set(1, 0, 0);
  if (Math.abs(axis.dot(u)) > 0.9) u.set(0, 1, 0);
  u.addScaledVector(axis, -axis.dot(u)).normalize();
  v.crossVectors(axis, u);
  rot.makeRotationFromQuaternion(qRel);
  b.copy(from.position).applyMatrix4(rot);
  b.subVectors(to.position, b);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const det = (1 - c) ** 2 + s ** 2;
  const bu = b.dot(u);
  const bv = b.dot(v);
  const pu = ((1 - c) * bu - s * bv) / det;
  const pv = (s * bu + (1 - c) * bv) / det;
  const along = to.position.clone().sub(from.position).dot(axis);
  pivot
    .copy(u)
    .multiplyScalar(pu)
    .addScaledVector(v, pv)
    .addScaledVector(axis, from.position.dot(axis));
  qStep.setFromAxisAngle(axis, angle * t);
  off.subVectors(from.position, pivot).applyQuaternion(qStep);
  outP
    .copy(pivot)
    .add(off)
    .addScaledVector(axis, along * t);
  outQ.copy(qStep).multiply(from.quaternion);
}

/** Lifts off the mat, turns over, sets back down. */
export function liftLerp(
  from: Pose,
  to: Pose,
  t: number,
  lift: number,
  outP: Vector3,
  outQ: Quaternion,
) {
  outP.lerpVectors(from.position, to.position, t);
  outP.y += Math.sin(Math.PI * t) * lift;
  outQ.slerpQuaternions(from.quaternion, to.quaternion, t);
}
