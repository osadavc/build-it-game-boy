import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  type Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useBuilder } from "@/lib/kit/store";
import { sceneRefs } from "./registry";

/*
 * The 21-wire flex (Nintendo 21C-65L): soldered to the LCD board's top edge,
 * free end with a blue stiffener plugs into the CPU board's friction socket.
 * Paths are in the device frame; the strip is rebuilt every frame from the
 * two halves' live poses.
 */
const N = 64;
const WIDTH = 27.6;

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** Lying folded back over the LCD board (front half). */
const FOLDED = new CatmullRomCurve3([
  v(5.13, 64.83, 7.575),
  v(5.13, 66.8, 7.1),
  v(5.13, 67.4, 5.0),
  v(5.13, 64.5, 2.7),
  v(5.13, 54, 2.3),
  v(5.13, 38, 2.3),
]);

/** Seated with the case closed: J-fold over the top, down behind the LCD board, up into the socket. */
const CLOSED = new CatmullRomCurve3([
  v(5.13, 64.83, 7.575),
  v(5.1, 67.6, 7.35),
  v(5.05, 69.6, 6.4),
  v(5.0, 68.8, 5.95),
  v(4.95, 62, 5.9),
  v(4.9, 52, 5.9),
  v(4.85, 44.2, 5.85),
  v(4.8, 41.6, 5.4),
  v(4.8, 41.4, 4.5),
  v(4.8, 43.5, 4.2),
  v(4.8, 47.0, 4.2),
]);

/** Socket mouth (CPU board J2, device frame) and its insertion direction. */
const SOCKET = v(4.8, 47.0, 4.2);

function ribbonTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (ctx) {
    // u across the width, v along the length (0 = board edge, 1 = tip).
    const band = (a: number, b: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, a * 512, 128, (b - a) * 512);
    };
    band(0, 1, "#e9ecec");
    band(0.12, 0.43, "rgba(237,227,160,0.95)");
    band(0.534, 0.883, "#1f7fd8");
    band(0.883, 1, "#d6d9db");
    ctx.fillStyle = "rgba(150,158,164,0.85)";
    for (let i = 0; i < 21; i++) {
      const x = 4 + (i * 120) / 20;
      ctx.fillRect(x - 1.2, 0, 2.4, 512);
    }
    ctx.fillStyle = "rgba(190,196,200,1)";
    for (let i = 0; i < 21; i++) {
      const x = 4 + (i * 120) / 20;
      ctx.fillRect(x - 1.6, 0.883 * 512, 3.2, 0.117 * 512);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const tmpA = new Vector3();
const tmpB = new Vector3();

export function Ribbon() {
  const lcdInstalled = useBuilder((s) => {
    const id = s.filled["lcd-board"];
    return !!id && s.instances[id]?.status === "installed";
  });
  const seated = useBuilder((s) => !!s.actionsDone.ribbon);
  const seatedAt = useRef<number | null>(null);
  useEffect(() => {
    seatedAt.current = seated ? performance.now() : null;
  }, [seated]);

  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3),
    );
    const uv = new Float32Array((N + 1) * 2 * 2);
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      uv.set([0, 1 - i / N, 1, 1 - i / N], i * 4);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    g.setAttribute("uv", new BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new MeshStandardMaterial({
      map: ribbonTexture(),
      roughness: 0.38,
      metalness: 0.05,
      side: DoubleSide,
    });
    return { geometry: g, material: m };
  }, []);

  const ref = useRef<Mesh>(null);
  const pts = useMemo(
    () => ({
      folded: FOLDED.getSpacedPoints(N),
      closed: CLOSED.getSpacedPoints(N),
      world: Array.from({ length: N + 1 }, () => new Vector3()),
      a: Array.from({ length: N + 1 }, () => new Vector3()),
      b: Array.from({ length: N + 1 }, () => new Vector3()),
      xf: new Vector3(),
      xb: new Vector3(),
      yf: new Vector3(),
      yb: new Vector3(),
    }),
    [],
  );

  useFrame(() => {
    const mesh = ref.current;
    const front = sceneRefs.groups.front;
    const back = sceneRefs.groups.back;
    if (!mesh || !front || !back) return;
    mesh.visible = lcdInstalled && useBuilder.getState().explode < 0.02;
    if (!mesh.visible) return;
    front.updateMatrixWorld();
    back.updateMatrixWorld();
    const mf = front.matrixWorld;
    const mb = back.matrixWorld;
    pts.xf.set(1, 0, 0).transformDirection(mf);
    pts.xb.set(1, 0, 0).transformDirection(mb);
    pts.yf.set(0, 1, 0).transformDirection(mf);
    pts.yb.set(0, 1, 0).transformDirection(mb);

    // Seating progress (action) and closing progress (angle between halves).
    const q =
      seatedAt.current === null
        ? 0
        : Math.min(1, (performance.now() - seatedAt.current) / 900);
    const ease = q * q * (3 - 2 * q);
    const dot = Math.min(1, Math.abs(front.quaternion.dot(back.quaternion)));
    const closed = 1 - (2 * Math.acos(dot)) / Math.PI;

    // Seated & open: a cubic from the board edge to the socket mouth.
    const p0 = tmpA.copy(FOLDED.points[0]).applyMatrix4(mf);
    const p3 = tmpB.copy(SOCKET).applyMatrix4(mb);
    const k = 16;
    const p1 = p0.clone().addScaledVector(pts.yf, k);
    const p2 = p3.clone().addScaledVector(pts.yb, -k);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const u = 1 - t;
      const open = pts.a[i]
        .copy(p0)
        .multiplyScalar(u * u * u)
        .addScaledVector(p1, 3 * u * u * t)
        .addScaledVector(p2, 3 * u * t * t)
        .addScaledVector(p3, t * t * t);
      const shut = pts.b[i].copy(pts.closed[i]).applyMatrix4(mb);
      const seatedPt = open.lerp(shut, Math.max(0, Math.min(1, closed)));
      const folded = pts.world[i].copy(pts.folded[i]).applyMatrix4(mf);
      folded.lerp(seatedPt, ease);
    }
    const pos = geometry.attributes.position as BufferAttribute;
    const w = new Vector3();
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * ease;
      w.copy(pts.xf)
        .lerp(pts.xb, t)
        .normalize()
        .multiplyScalar(WIDTH / 2);
      const p = pts.world[i];
      pos.setXYZ(i * 2, p.x - w.x, p.y - w.y, p.z - w.z);
      pos.setXYZ(i * 2 + 1, p.x + w.x, p.y + w.y, p.z + w.z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  });

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      castShadow
      frustumCulled={false}
    />
  );
}
