import { ContactShadows, Grid } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

/** Usable bench area (mm) — loose parts are kept inside it. */
export const MAT = { w: 520, d: 420 };

/**
 * A seamless floor: a faint 10 mm grid that fades into the backdrop (the soft
 * contact shadow is rendered separately). Hidden when the camera dips below
 * the bench so the build can be seen from underneath.
 */
export function Mat() {
  const ref = useRef<Group>(null);
  // Looking up from under the bench, the floor would hide the build: drop it.
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y > 1;
  });
  return (
    <group ref={ref}>
      <ContactShadows
        position={[0, -0.03, 0]}
        scale={720}
        resolution={1024}
        far={160}
        blur={2.4}
        opacity={0.42}
        color="#3a3630"
      />
      <Grid
        position={[0, -0.02, 0]}
        args={[1200, 1200]}
        cellSize={10}
        cellThickness={0.55}
        cellColor="#d3d0c8"
        sectionSize={50}
        sectionThickness={0.9}
        sectionColor="#c7c3b9"
        fadeDistance={620}
        fadeStrength={2.4}
        infiniteGrid
      />
    </group>
  );
}
