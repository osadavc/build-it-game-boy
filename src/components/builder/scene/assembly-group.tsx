import { useFrame } from "@react-three/fiber";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { type Group, Quaternion, Vector3 } from "three";
import { POSES } from "@/lib/kit/data";
import { effectivePose, useBuilder } from "@/lib/kit/store";
import type { GroupId, PoseId } from "@/lib/kit/types";
import {
  clamp01,
  easeInOut,
  hingeLerp,
  liftLerp,
  type Pose,
  poseFrom,
} from "./pose-math";
import { sceneRefs } from "./registry";

const target = (pose: PoseId, id: GroupId): Pose => {
  const p = POSES[pose][id];
  return poseFrom(p.position, p.rotation);
};

interface Anim {
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
  kind: "hinge" | "lift";
}

/** One half of the Game Boy (front or back) that moves between poses. */
export function AssemblyGroup({
  id,
  children,
}: {
  id: GroupId;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const poseId = useBuilder((s) => effectivePose(s.stepIndex, s.actionsDone));
  const last = useRef<PoseId | null>(null);
  const anim = useRef<Anim | null>(null);

  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    sceneRefs.groups[id] = g;
    return () => {
      sceneRefs.groups[id] = null;
    };
  }, [id]);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const to = target(poseId, id);
    const prev = last.current;
    last.current = poseId;
    if (prev === null) {
      g.position.copy(to.position);
      g.quaternion.copy(to.quaternion);
      g.updateMatrixWorld(true);
      return;
    }
    const from: Pose = {
      position: g.position.clone(),
      quaternion: g.quaternion.clone(),
    };
    const moved =
      from.position.distanceTo(to.position) > 0.01 ||
      Math.abs(from.quaternion.dot(to.quaternion)) < 0.9999;
    if (!moved) return;
    const hinge = prev === "open" && poseId !== "open" && id === "front";
    anim.current = {
      from,
      to,
      start: performance.now() + (hinge ? 150 : 0),
      duration: hinge ? 1500 : 1300,
      kind: hinge ? "hinge" : "lift",
    };
  }, [poseId, id]);

  const p = useRef(new Vector3());
  const q = useRef(new Quaternion());
  useFrame(() => {
    const a = anim.current;
    const g = ref.current;
    if (!a || !g) return;
    const t = clamp01((performance.now() - a.start) / a.duration);
    const e = easeInOut(t);
    if (a.kind === "hinge") hingeLerp(a.from, a.to, e, p.current, q.current);
    else liftLerp(a.from, a.to, e, 85, p.current, q.current);
    g.position.copy(p.current);
    g.quaternion.copy(q.current);
    if (t >= 1) anim.current = null;
  });

  return (
    <group ref={ref} name={`group-${id}`}>
      {children}
    </group>
  );
}
