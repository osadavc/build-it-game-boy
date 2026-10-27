"use client";

import { useBuilder } from "@/lib/kit/store";
import { updatePointer } from "../scene/registry";
import { useThumbs } from "../thumbnails";

/** Starts a drag once the pointer travels a few px; a still press is a click. */
export function useDragOrClick(part: string, onClick?: () => void) {
  const startDrag = useBuilder((s) => s.startDrag);
  return (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let started = false;
    const move = (ev: PointerEvent) => {
      if (started || Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      started = true;
      updatePointer(ev.clientX, ev.clientY);
      startDrag(part);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!started) onClick?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}

export function Thumb({
  k,
  className = "",
}: {
  k: string;
  className?: string;
}) {
  const src = useThumbs((s) => s.map[k]);
  return src ? (
    // biome-ignore lint/performance/noImgElement: generated data URL
    <img
      src={src}
      alt=""
      draggable={false}
      className={`object-contain ${className}`}
    />
  ) : (
    <div className={`animate-pulse rounded-lg bg-hair ${className}`} />
  );
}
