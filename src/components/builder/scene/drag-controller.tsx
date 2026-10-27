import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  type Group,
  type Mesh,
  type Object3D,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { SLOT_BY_ID, STEPS, TOOL_BY_ID } from "@/lib/kit/data";
import { clonePart, restInfo } from "@/lib/kit/prototypes";
import { useBuilder } from "@/lib/kit/store";
import { MAT } from "./mat";
import { dragRuntime, pointer, sceneRefs } from "./registry";
import { approachOf, previewLift, slotWorld } from "./slot-math";

const SNAP_PX = 64;
/** Height a held part floats above the bench, or above the build. */
const LIFT = 6;
const CLEARANCE = 2;
const carry = new Plane(new Vector3(0, 1, 0), 0);
const grown = new Box3();

const meshBox = new Box3();
/** World bounds of the fitted parts in one half (ghosts and hidden bits excluded). */
function solidBox(root: Object3D, out: Box3) {
  out.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.layers.isEnabled(0)) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    if (!m.geometry.boundingBox) return;
    meshBox.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
    out.union(meshBox);
  });
  return out;
}

const boxes = [new Box3(), new Box3()];
function modelBoxes() {
  const out: Box3[] = [];
  (["front", "back"] as const).forEach((id, i) => {
    const g = sceneRefs.groups[id];
    if (g && !solidBox(g, boxes[i]).isEmpty()) out.push(boxes[i]);
  });
  return out;
}

const inFootprint = (p: Vector3, b: Box3, m: number) =>
  p.x > b.min.x - m &&
  p.x < b.max.x + m &&
  p.z > b.min.z - m &&
  p.z < b.max.z + m;

/** Slides a bench position out from under the build to the nearest free edge. */
function clearOfModel(p: Vector3, margin: number) {
  const all = modelBoxes();
  for (let pass = 0; pass < 3; pass++) {
    for (const b of all) {
      if (!inFootprint(p, b, margin)) continue;
      const moves = [
        [b.min.x - margin - p.x, 0],
        [b.max.x + margin - p.x, 0],
        [0, b.min.z - margin - p.z],
        [0, b.max.z + margin - p.z],
      ].sort((a, c) => Math.hypot(a[0], a[1]) - Math.hypot(c[0], c[1]));
      p.x += moves[0][0] + Math.sign(moves[0][0]) * 0.5;
      p.z += moves[0][1] + Math.sign(moves[0][1]) * 0.5;
    }
  }
  p.x = Math.max(-MAT.w / 2 + 10, Math.min(MAT.w / 2 - 10, p.x));
  p.z = Math.max(-MAT.d / 2 + 10, Math.min(MAT.d / 2 - 10, p.z));
  return p;
}

/** Moves the part being dragged through the 3D scene and snaps it to slots. */
export function DragController() {
  const drag = useBuilder((s) => s.drag);
  const { camera, gl } = useThree();
  const ref = useRef<Group>(null);
  const obj = useMemo(() => (drag ? clonePart(drag.part) : null), [drag]);
  const tmp = useMemo(
    () => ({
      ray: new Raycaster(),
      ndc: new Vector2(),
      hit: new Vector3(),
      p: new Vector3(),
      q: dragRuntime.quaternion.clone(),
      proj: new Vector3(),
      // Height of the surface the part is carried over, eased between the
      // bench and the top of the build.
      height: 0,
    }),
    [],
  );

  // Dev aid for automated tests: screen position of a slot.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      __kitSlotScreen?: (id: string) => number[];
    };
    w.__kitSlotScreen = (id: string) => {
      const p = new Vector3();
      slotWorld(id, p, tmp.q);
      p.project(camera);
      const r = gl.domElement.getBoundingClientRect();
      return [
        r.left + ((p.x + 1) / 2) * r.width,
        r.top + ((1 - p.y) / 2) * r.height,
      ];
    };
  }, [camera, gl, tmp]);

  // Camera orbiting is paused while something is in hand.
  useEffect(() => {
    const c = sceneRefs.controls;
    if (c) c.enabled = !drag;
    document.body.style.cursor = drag ? "grabbing" : "";
    dragRuntime.active = !!drag;
    if (!drag) dragRuntime.snapped = null;
  }, [drag]);

  // A gentle note when the part in hand has no place in this step.
  useEffect(() => {
    if (!drag) return;
    const s = useBuilder.getState();
    const fits = STEPS[s.stepIndex].slots.some(
      (id) => !s.filled[id] && SLOT_BY_ID[id].part === drag.part,
    );
    if (!fits)
      s.notify(
        "This step doesn't use that. You can still set it down on the bench.",
      );
  }, [drag]);

  useEffect(() => {
    if (!drag) return;
    const onUp = () => {
      const s = useBuilder.getState();
      if (!s.drag) return;
      if (!pointer.inCanvas) {
        s.cancelDrag();
        return;
      }
      const snapped = dragRuntime.snapped;
      if (snapped) {
        const slot = SLOT_BY_ID[snapped];
        if (slot.tool && s.activeTool !== slot.tool) {
          s.notify(
            `That needs the ${TOOL_BY_ID[slot.tool].name}. Pick it up from Tools in the parts list.`,
            "warn",
          );
        } else {
          s.install(
            snapped,
            dragRuntime.position.toArray(),
            dragRuntime.quaternion.toArray() as [
              number,
              number,
              number,
              number,
            ],
          );
          return;
        }
      }
      const r = restInfo(s.drag.part);
      // Let go over the build (or refused for want of a tool): it's set down
      // on the bench just beside it rather than inside it.
      const p = clearOfModel(
        dragRuntime.ground.clone(),
        Math.max(r.size.x, r.size.z) / 2 + 8,
      ).add(r.offset);
      s.dropLoose(
        p.toArray(),
        r.quaternion.toArray() as [number, number, number, number],
      );
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!drag || !g) return;
    const rect = gl.domElement.getBoundingClientRect();
    tmp.ndc.set(
      ((pointer.x - rect.left) / rect.width) * 2 - 1,
      -((pointer.y - rect.top) / rect.height) * 2 + 1,
    );
    tmp.ray.setFromCamera(tmp.ndc, camera);
    const r = restInfo(drag.part);

    // The part rides where the pointer's ray first meets the build (padded
    // by the part's own size), so it passes over a build lying flat and in
    // front of one standing up, never through it. Elsewhere it floats above
    // the bench.
    const reach = Math.max(r.size.x, r.size.z) / 2 + 4;
    let target = 0;
    for (const b of modelBoxes()) {
      grown.copy(b);
      grown.min.x -= reach;
      grown.min.z -= reach;
      grown.max.x += reach;
      grown.max.z += reach;
      grown.max.y += CLEARANCE;
      if (
        tmp.ray.ray.intersectBox(grown, tmp.hit) &&
        tmp.hit.y <= grown.max.y + 0.01
      )
        target = Math.max(target, tmp.hit.y);
    }
    tmp.height = pointer.inCanvas
      ? tmp.height + (target - tmp.height) * (1 - Math.exp(-delta * 14))
      : target;
    carry.constant = -tmp.height;
    if (!tmp.ray.ray.intersectPlane(carry, tmp.hit)) {
      carry.constant = 0;
      if (!tmp.ray.ray.intersectPlane(carry, tmp.hit)) return;
    }
    tmp.hit.x = Math.max(-MAT.w / 2 + 10, Math.min(MAT.w / 2 - 10, tmp.hit.x));
    tmp.hit.z = Math.max(-MAT.d / 2 + 10, Math.min(MAT.d / 2 - 10, tmp.hit.z));

    // Find the nearest open slot (current step) that accepts this part.
    const s = useBuilder.getState();
    const step = STEPS[s.stepIndex];
    let best: string | null = null;
    let bestD = SNAP_PX;
    for (const id of step.slots) {
      if (s.filled[id] || SLOT_BY_ID[id].part !== drag.part) continue;
      // Parts that wait well clear of their seat (screws, the cartridge) also
      // catch when brought to where they wait.
      const lift = previewLift(id);
      for (const k of lift > 2 ? [0, lift] : [0]) {
        slotWorld(id, tmp.p, tmp.q, approachOf(id).multiplyScalar(-k));
        tmp.proj.copy(tmp.p).project(camera);
        const sx = rect.left + ((tmp.proj.x + 1) / 2) * rect.width;
        const sy = rect.top + ((1 - tmp.proj.y) / 2) * rect.height;
        const d = Math.hypot(sx - pointer.x, sy - pointer.y);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }

    // Bench spot under the part, for setting it down.
    dragRuntime.ground.set(tmp.hit.x, 0, tmp.hit.z);
    if (best) {
      const a = approachOf(best).multiplyScalar(-previewLift(best));
      slotWorld(best, g.position, g.quaternion, a);
    } else {
      g.quaternion.copy(r.quaternion);
      g.position.copy(tmp.hit).add(r.offset);
      g.position.y += LIFT;
    }
    g.visible = pointer.inCanvas;
    dragRuntime.position.copy(g.position);
    dragRuntime.quaternion.copy(g.quaternion);
    dragRuntime.snapped = best;
    s.setHoverSlot(best);
  });

  if (!obj) return null;
  return <primitive ref={ref} object={obj} visible={false} />;
}
