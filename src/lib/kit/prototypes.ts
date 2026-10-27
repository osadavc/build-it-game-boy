import {
  Box3,
  Euler,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from "three";
import { PART_BY_ID, TOOL_BY_ID } from "./data";
import type { ToolId } from "./types";

const protos = new Map<string, Object3D>();

function prepare(obj: Object3D) {
  obj.traverse((o) => {
    if ((o as Mesh).isMesh) {
      const m = o as Mesh;
      if (m.name !== "print" && m.name !== "noshadow") {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    }
  });
  return obj;
}

export function getPrototype(part: string): Object3D {
  let p = protos.get(part);
  if (!p) {
    const def = PART_BY_ID[part];
    if (!def) throw new Error(`Unknown part ${part}`);
    p = prepare(def.build());
    p.name = part;
    protos.set(part, p);
  }
  return p;
}

export const clonePart = (part: string) => getPrototype(part).clone(true);

const toolProtos = new Map<ToolId, Object3D>();
export function getToolPrototype(tool: ToolId) {
  let p = toolProtos.get(tool);
  if (!p) {
    p = prepare(TOOL_BY_ID[tool].build());
    toolProtos.set(tool, p);
  }
  return p;
}

interface RestInfo {
  quaternion: Quaternion;
  /** Add to the cursor point so the part lies centred with its lowest point on y=0. */
  offset: Vector3;
  size: Vector3;
}

const restCache = new Map<string, RestInfo>();

/** Orientation + offset so a loose part lies naturally on the mat. */
export function restInfo(part: string): RestInfo {
  let r = restCache.get(part);
  if (!r) {
    const def = PART_BY_ID[part];
    const e = def.rest ?? [-Math.PI / 2, 0, 0];
    const quaternion = new Quaternion().setFromEuler(new Euler(...e));
    const obj = getPrototype(part).clone(true);
    obj.quaternion.copy(quaternion);
    obj.updateMatrixWorld(true);
    const box = new Box3().setFromObject(obj, true);
    const center = box.getCenter(new Vector3());
    r = {
      quaternion,
      // 0.05 mm clearance keeps flat bottoms from fighting the ground.
      offset: new Vector3(-center.x, -box.min.y + 0.05, -center.z),
      size: box.getSize(new Vector3()),
    };
    restCache.set(part, r);
  }
  return r;
}

const ghostMaterial = new MeshStandardMaterial({
  color: "#5868f0",
  emissive: "#5868f0",
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  roughness: 0.6,
});
const ghostSnapMaterial = new MeshStandardMaterial({
  color: "#2f8f4a",
  emissive: "#2f8f4a",
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
  roughness: 0.6,
});

export const ghostMaterials = { idle: ghostMaterial, snap: ghostSnapMaterial };

/**
 * Depth-only pass drawn just before a ghost, so the translucent tint shows
 * only the ghost's front surface. Without it every hidden rib and wall inside
 * the part stacks up into stripes over whatever sits behind.
 */
const ghostDepth = new MeshBasicMaterial({
  colorWrite: false,
  transparent: true,
});

/** A clone of the part with every material swapped for `mat`. */
export function ghostOf(part: string, mat: Material) {
  const g = clonePart(part);
  const meshes: Mesh[] = [];
  g.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  for (const m of meshes) {
    if (m.name === "print") m.visible = false;
    m.material = mat;
    m.castShadow = false;
    m.receiveShadow = false;
    m.raycast = () => {};
    m.layers.set(1);
    m.renderOrder = 4;
    const depth = new Mesh(m.geometry, ghostDepth);
    depth.renderOrder = 3;
    depth.raycast = () => {};
    depth.layers.set(1);
    depth.visible = m.visible;
    m.add(depth);
  }
  return g;
}
