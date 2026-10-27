"use client";

import { CameraControls, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import CameraControlsImpl from "camera-controls";
import { useEffect, useRef } from "react";
import {
  Box3,
  Euler,
  Matrix4,
  NeutralToneMapping,
  Quaternion,
  Vector3,
} from "three";
import { POSES, STEPS } from "@/lib/kit/data";
import { effectivePose, useBuilder } from "@/lib/kit/store";
import type { GroupId, PoseId } from "@/lib/kit/types";
import { AssemblyGroup } from "./assembly-group";
import { DeviceLife } from "./device-life";
import { DragController } from "./drag-controller";
import { Mat } from "./mat";
import {
  Ghosts,
  InstalledParts,
  InstallingParts,
  LooseParts,
} from "./parts-layer";
import { sceneRefs } from "./registry";
import { Ribbon } from "./ribbon";
import { Wires } from "./wires";

const { ACTION } = CameraControlsImpl;

const poseMatrix = (poseId: PoseId, id: GroupId) => {
  const p = POSES[poseId][id];
  return new Matrix4().compose(
    new Vector3(...p.position),
    new Quaternion().setFromEuler(new Euler(...p.rotation)),
    new Vector3(1, 1, 1),
  );
};

/**
 * The middle of what's on the bench for this step, in world space: the
 * bounding-box centre of the half being worked on (or of the whole device
 * once the halves are joined), taken in the pose the halves are heading to so
 * it's right even while they're still moving.
 */
function modelCentre(stepIndex: number, poseId: PoseId) {
  const v = STEPS[stepIndex].view;
  const ids: GroupId[] =
    poseId !== "open" || v.group === "both" ? ["front", "back"] : [v.group];
  const sum = new Vector3();
  for (const id of ids) {
    // Shell centre (device frame) until something is fitted in this half.
    const local = new Vector3(0, 0, id === "front" ? 9.6 : -6.5);
    const g = sceneRefs.groups[id];
    if (g) {
      g.updateMatrixWorld(true);
      const box = new Box3();
      for (const child of g.children) box.expandByObject(child);
      if (!box.isEmpty())
        local
          .copy(box.getCenter(new Vector3()))
          .applyMatrix4(g.matrixWorld.clone().invert());
    }
    sum.add(local.applyMatrix4(poseMatrix(poseId, id)));
  }
  return sum.divideScalar(ids.length);
}

function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const stepIndex = useBuilder((s) => s.stepIndex);
  const poseId = useBuilder((s) => effectivePose(s.stepIndex, s.actionsDone));
  const nonce = useBuilder((s) => s.viewNonce);
  const exploded = useBuilder((s) => s.explode > 0.05);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    sceneRefs.controls = ref.current;
  }, []);

  // Frame the step: orbit centre on the work piece, viewed from the step's side.
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce re-frames on demand
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (exploded) {
      c.setLookAt(560, 280, 260, 0, 84, -8, true);
      return;
    }
    const v = STEPS[stepIndex].view;
    const t = modelCentre(stepIndex, poseId);
    const d = new Vector3(...v.dir).normalize().multiplyScalar(v.dist);
    c.setLookAt(t.x + d.x, t.y + d.y, t.z + d.z, t.x, t.y, t.z, true);
  }, [stepIndex, poseId, nonce, exploded]);

  // Shift turns a left-drag into a pan; trackpad two-finger scroll turns the
  // view (Shift + scroll pans); a mouse wheel and pinch still zoom.
  useEffect(() => {
    const c = ref.current;
    const el = gl.domElement.parentElement;
    if (!c || !el) return;
    const key = (e: KeyboardEvent) => {
      c.mouseButtons.left = e.shiftKey ? ACTION.TRUCK : ACTION.ROTATE;
    };
    const wheel = (e: WheelEvent) => {
      const mouseWheel =
        e.deltaMode !== 0 ||
        (e.deltaX === 0 &&
          Math.abs(e.deltaY) >= 40 &&
          Number.isInteger(e.deltaY));
      if (e.ctrlKey || mouseWheel) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.shiftKey) {
        const k = c.distance * 0.0016;
        void c.truck(e.deltaX * k, e.deltaY * k, false);
      } else {
        void c.rotate(-e.deltaX * 0.006, -e.deltaY * 0.006, false);
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    el.addEventListener("wheel", wheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      el.removeEventListener("wheel", wheel, { capture: true });
    };
  }, [gl]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={22}
      maxDistance={1000}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      smoothTime={0.38}
      draggingSmoothTime={0.08}
    />
  );
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#d9d4c8", 0.55]} />
      <directionalLight
        position={[-140, 320, 200]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.4}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
        shadow-camera-near={50}
        shadow-camera-far={900}
        shadow-radius={5}
      />
      <directionalLight position={[220, 160, -160]} intensity={0.45} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#c9c6be"]} />
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 6, 0]}
          rotation-x={Math.PI / 2}
          scale={[10, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[-6, 2, 3]}
          rotation-y={Math.PI / 3}
          scale={[6, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          position={[6, 2, -2]}
          rotation-y={-Math.PI / 2.5}
          scale={[6, 3, 1]}
        />
        <Lightformer
          form="ring"
          color="#ffeedd"
          intensity={0.6}
          position={[0, 3, 6]}
          scale={3}
        />
      </Environment>
    </>
  );
}

export default function Workbench() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 30, near: 6, far: 2400, position: [0, 420, 420] }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl, camera }) => {
        // Layer 1 holds the placement outlines: seen by the camera, ignored by the floor shadow.
        camera.layers.enable(1);
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
        sceneRefs.canvas = gl.domElement;
      }}
      style={{ touchAction: "none" }}
    >
      <Lighting />
      <CameraRig />
      <Mat />
      <AssemblyGroup id="back">
        <InstalledParts group="back" />
        <Wires group="back" />
        <Ghosts group="back" />
      </AssemblyGroup>
      <AssemblyGroup id="front">
        <InstalledParts group="front" />
        <Wires group="front" />
        <Ghosts group="front" />
      </AssemblyGroup>
      <Ribbon />
      <LooseParts />
      <InstallingParts />
      <DragController />
      <DeviceLife />
    </Canvas>
  );
}
