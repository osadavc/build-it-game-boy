import {
  Box3,
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { create } from "zustand";
import type { Vec3 } from "@/lib/kit/types";

export const useThumbs = create<{ map: Record<string, string> }>(() => ({
  map: {},
}));

export interface ThumbJob {
  key: string;
  build: () => Object3D;
  view?: Vec3;
}

let running = false;

/** Renders each part once into a small PNG for the parts tray. */
export async function renderThumbnails(jobs: ThumbJob[], size = 176) {
  if (running) return;
  running = true;
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  // Strong top-left key and a cool fill so pale plastics still show their form.
  scene.add(new HemisphereLight("#ffffff", "#8d877b", 0.45));
  const key = new DirectionalLight("#ffffff", 2.4);
  key.position.set(-2, 3, 2.5);
  scene.add(key);
  const fill = new DirectionalLight("#dfe6ff", 0.5);
  fill.position.set(3, -1, 2);
  scene.add(fill);
  const camera = new PerspectiveCamera(24, 1, 0.1, 5000);
  const box = new Box3();
  const sphere = new Sphere();
  const dir = new Vector3();

  for (const job of jobs) {
    const obj = job.build();
    scene.add(obj);
    obj.updateMatrixWorld(true);
    box.setFromObject(obj, true);
    box.getBoundingSphere(sphere);
    const r = Math.max(sphere.radius, 0.5);
    dir.set(...(job.view ?? [0.55, 0.75, 1])).normalize();
    const dist = (r / Math.sin(((camera.fov / 2) * Math.PI) / 180)) * 1.02;
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    camera.near = dist / 50;
    camera.far = dist * 4;
    camera.updateProjectionMatrix();
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL("image/png");
    scene.remove(obj);
    useThumbs.setState((s) => ({ map: { ...s.map, [job.key]: url } }));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  running = false;
}

/** DMG-ish palette the portrait is snapped to. */
const PALETTE = [
  "#f1efe9",
  "#d4d0c9",
  "#bab5ad",
  "#99948c",
  "#6f6b66",
  "#59565f",
  "#3a3842",
  "#9b9a33",
  "#707326",
  "#a3195a",
  "#6c103b",
  "#8a8590",
  "#3e3884",
  "#2a292e",
].map((h) => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
]);
const OUTLINE = [38, 37, 42];

function nearest(r: number, g: number, b: number) {
  let best = PALETTE[0];
  let bd = Number.POSITIVE_INFINITY;
  for (const c of PALETTE) {
    const d = 2 * (r - c[0]) ** 2 + 4 * (g - c[1]) ** 2 + 3 * (b - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/**
 * Renders the finished Game Boy, shrinks it to a w × h sprite, snaps every
 * pixel to the palette and adds a 1 px outline — a pixel-art portrait made
 * from the real model rather than drawn by hand.
 */
export async function renderPortrait(build: () => Object3D, w = 28, h = 44) {
  const scale = 6;
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(w * scale, h * scale);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  scene.add(new HemisphereLight("#ffffff", "#8d877b", 0.5));
  const key = new DirectionalLight("#ffffff", 2.2);
  key.position.set(-2, 3, 3);
  scene.add(key);

  const obj = build();
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new Box3().setFromObject(obj, true);
  const centre = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const camera = new PerspectiveCamera(12, w / h, 1, 5000);
  const dir = new Vector3(0.24, 0.14, 1).normalize();
  const dist =
    (size.y / 2 / Math.tan(((camera.fov / 2) * Math.PI) / 180)) * 1.1;
  camera.position.copy(centre).addScaledVector(dir, dist);
  camera.lookAt(centre);
  renderer.render(scene, camera);

  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(renderer.domElement, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (d[o + 3] < 120) {
        d[o + 3] = 0;
        continue;
      }
      solid[i] = 1;
      const [r, g, b] = nearest(
        d[o] / (d[o + 3] / 255),
        d[o + 1] / (d[o + 3] / 255),
        d[o + 2] / (d[o + 3] / 255),
      );
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
    }
    // Outline: any empty pixel touching the sprite.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (solid[i]) continue;
        const touch =
          (x > 0 && solid[i - 1]) ||
          (x < w - 1 && solid[i + 1]) ||
          (y > 0 && solid[i - w]) ||
          (y < h - 1 && solid[i + w]);
        if (!touch) continue;
        const o = i * 4;
        d[o] = OUTLINE[0];
        d[o + 1] = OUTLINE[1];
        d[o + 2] = OUTLINE[2];
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = small.toDataURL("image/png");
    useThumbs.setState((s) => ({ map: { ...s.map, portrait: url } }));
  }
  scene.remove(obj);
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}
