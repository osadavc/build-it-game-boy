import { Group, Mesh, MeshStandardMaterial } from "three";
import { box } from "@/lib/three/csg";

/** Temporary stand-in box (w × h × d mm) centred at (x, y, z). */
export function placeholder(
  w: number,
  h: number,
  d: number,
  color: string,
  x = 0,
  y = 0,
  z = 0,
) {
  const g = new Group();
  g.add(
    new Mesh(
      box(w, h, d, x, y, z),
      new MeshStandardMaterial({ color, roughness: 0.6 }),
    ),
  );
  return g;
}
