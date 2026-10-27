import { useMemo } from "react";
import {
  CatmullRomCurve3,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useBuilder } from "@/lib/kit/store";
import type { GroupId } from "@/lib/kit/types";

/*
 * Lead wires that only exist once both of their ends are fitted. Paths are
 * hand-routed in the device frame from the research notes (speaker leads run
 * down the right side and over the ring; harnesses hug the left wall).
 */
type Harness = {
  id: string;
  group: GroupId;
  needs: string[];
  color: string[];
  paths: [number, number, number][][];
};

const HARNESSES: Harness[] = [
  {
    id: "speaker-leads",
    group: "front",
    needs: ["speaker", "lcd-board"],
    color: ["#e8cf3a", "#e8cf3a"],
    paths: [
      [
        [36.42, -37.72, 7.6],
        [38.6, -42, 7.4],
        [39.6, -50, 7.7],
        [38.5, -57, 7.9],
        [35.93, -58.88, 7.92],
      ],
      [
        [32.42, -37.72, 7.6],
        [39.0, -42.6, 7.3],
        [40.3, -52, 7.6],
        [38.4, -62, 7.9],
        [30, -67.6, 7.95],
        [23.08, -66.01, 7.92],
      ],
    ],
  },
  {
    id: "dcdc-harness",
    group: "back",
    needs: ["cpu-board", "dcdc-board"],
    color: ["#c8202a", "#1f7a3a", "#1f7a3a", "#1f7a3a"],
    paths: [19.15, 16.67, 14.24, 11.68].map((y, i) => [
      [-36.1, y, -0.4],
      [-40.4, y - 2.5, -1.4],
      [-41.2, -6 - i * 0.6, -3 - i * 0.4],
      [-40.4, -13.5, -3.5 - i * 1.4],
      [-38.0, -15.5, -2.6 - i * 2.2],
    ]),
  },
  {
    id: "jack-harness",
    group: "back",
    needs: ["cpu-board", "jack-board"],
    color: ["#eeeeee", "#1a1a1a", "#1a1a1a", "#1a1a1a"],
    paths: [-30.66, -33.15, -35.65, -38.2].map((x, i) => [
      [x, -8.25, -0.4],
      [x + 0.5, -10.8, 2.6],
      [-30.5 + i * 0.6, -14.5, 3.9],
      [-24 + i * 0.6, -36, 4.1],
      [-20.5, -50 - i * 0.6, 4.4],
      [-18.0, -55.5 - i * 2.5, 4.9],
    ]),
  },
];

function HarnessMesh({ h }: { h: Harness }) {
  const meshes = useMemo(() => {
    const byColor = new Map<string, TubeGeometry[]>();
    h.paths.forEach((p, i) => {
      const curve = new CatmullRomCurve3(
        p.map(([x, y, z]) => new Vector3(x, y, z)),
        false,
        "centripetal",
      );
      const tube = new TubeGeometry(curve, 48, 0.42, 6, false);
      const c = h.color[i];
      byColor.set(c, [...(byColor.get(c) ?? []), tube]);
    });
    return [...byColor].map(([color, geos]) => {
      const m = new Mesh(
        mergeGeometries(geos),
        new MeshStandardMaterial({ color, roughness: 0.45 }),
      );
      m.castShadow = true;
      return m;
    });
  }, [h]);
  return (
    <>
      {meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  );
}

export function Wires({ group }: { group: GroupId }) {
  const filled = useBuilder((s) => s.filled);
  const instances = useBuilder((s) => s.instances);
  const explode = useBuilder((s) => s.explode);
  const ok = (slot: string) => {
    const id = filled[slot];
    return !!id && instances[id]?.status === "installed";
  };
  if (explode > 0.02) return null;
  return (
    <>
      {HARNESSES.filter((h) => h.group === group && h.needs.every(ok)).map(
        (h) => (
          <HarnessMesh key={h.id} h={h} />
        ),
      )}
    </>
  );
}
