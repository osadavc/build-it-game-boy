"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Group } from "three";
import { PARTS, SLOTS } from "@/lib/kit/data";
import { clonePart } from "@/lib/kit/prototypes";
import { preloadSfx } from "@/lib/kit/sfx";
import { useBuilder } from "@/lib/kit/store";
import { useDevMode } from "./dev-bar";
import { DragGhost } from "./drag-ghost";
import { Instructions } from "./instructions";
import { PartsPanel } from "./parts-panel";
import { updatePointer } from "./scene/registry";
import { StageOverlay } from "./stage-overlay";
import { renderPortrait, renderThumbnails } from "./thumbnails";

/** The finished Game Boy: every fitted part at its slot, standing face-on. */
function buildFinished() {
  const g = new Group();
  for (const s of SLOTS) {
    // Only what can be seen from the front matters for the portrait.
    if (!FRONT_VISIBLE.has(s.part)) continue;
    const o = clonePart(s.part);
    o.position.set(...s.position);
    o.rotation.set(...(s.rotation ?? [0, 0, 0]));
    g.add(o);
  }
  return g;
}

const FRONT_VISIBLE = new Set([
  "front-shell",
  "back-shell",
  "lens",
  "lcd-board",
  "dpad",
  "ab-button",
  "start-select",
]);

const Workbench = dynamic(() => import("./scene/workbench"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <span className="animate-pulse text-[13px] text-ink-3">
        Preparing the bench…
      </span>
    </div>
  ),
});

export function BuilderApp() {
  useDevMode();
  useEffect(() => {
    const move = (e: PointerEvent) => updatePointer(e.clientX, e.clientY);
    // Sounds can only start after a user gesture; decode them on the first one.
    const first = () => preloadSfx();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerdown", first, { once: true });
    if (process.env.NODE_ENV !== "production") {
      // Test aid only: completes the current step without user input.
      (window as unknown as { __kitAuto?: () => void }).__kitAuto = () =>
        useBuilder.getState().autoStep();
    }
    const idle = requestIdleCallback(
      () => {
        void renderThumbnails(
          PARTS.map((p) => ({
            key: p.id,
            build: () => clonePart(p.id),
            view: p.thumbView,
          })),
        ).then(() => renderPortrait(buildFinished));
      },
      { timeout: 800 },
    );
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerdown", first);
      cancelIdleCallback(idle);
    };
  }, []);

  return (
    <div className="stage-backdrop relative h-dvh select-none overflow-hidden text-ink [--left:272px] [--right:328px] xl:[--left:304px] xl:[--right:364px]">
      <div className="absolute inset-y-3 left-3 flex w-[var(--left)]">
        <PartsPanel />
      </div>
      <main className="absolute inset-y-0 right-[calc(var(--right)+24px)] left-[calc(var(--left)+24px)]">
        <Workbench />
        <StageOverlay />
      </main>
      <div className="absolute inset-y-3 right-3 flex w-[var(--right)]">
        <Instructions />
      </div>
      <DragGhost />
    </div>
  );
}
