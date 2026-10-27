"use client";

import {
  Bounds,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { NeutralToneMapping } from "three";
import { clonePart, getToolPrototype } from "@/lib/kit/prototypes";
import type { ToolId } from "@/lib/kit/types";

export default function InspectorCanvas() {
  const params = useSearchParams();
  const part = params.get("p") ?? "front-shell";
  const dir = (params.get("dir") ?? "0.4,0.5,1").split(",").map(Number);
  const target = params.get("t")?.split(",").map(Number) as
    | [number, number, number]
    | undefined;
  const dist = Number(params.get("d") ?? 120);
  const obj = useMemo(
    () =>
      part.startsWith("tool:")
        ? getToolPrototype(part.slice(5) as ToolId).clone(true)
        : clonePart(part),
    [part],
  );
  return (
    <Canvas
      camera={{
        fov: 30,
        near: 0.5,
        far: 5000,
        position: target
          ? [
              target[0] + (dir[0] * dist) / Math.hypot(dir[0], dir[1], dir[2]),
              target[1] + (dir[1] * dist) / Math.hypot(dir[0], dir[1], dir[2]),
              target[2] + (dir[2] * dist) / Math.hypot(dir[0], dir[1], dir[2]),
            ]
          : [dir[0] * 200, dir[1] * 200, dir[2] * 200],
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
      }}
    >
      <color attach="background" args={["#efeee9"]} />
      <hemisphereLight args={["#ffffff", "#d9d4c8", 0.7]} />
      <directionalLight position={[-100, 200, 300]} intensity={1.8} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#bdbab2"]} />
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 5, 2]}
          scale={[10, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[-5, 1, 3]}
          scale={[4, 3, 1]}
        />
      </Environment>
      {target ? (
        <>
          <primitive object={obj} />
          <OrbitControls makeDefault target={target} />
        </>
      ) : (
        <>
          <Bounds fit clip observe margin={1.1}>
            <primitive object={obj} />
          </Bounds>
          <OrbitControls makeDefault />
        </>
      )}
    </Canvas>
  );
}
