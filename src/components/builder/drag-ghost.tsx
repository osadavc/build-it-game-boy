"use client";

import { useEffect, useRef } from "react";
import { PART_BY_ID } from "@/lib/kit/data";
import { useBuilder } from "@/lib/kit/store";
import { pointer } from "./scene/registry";
import { useThumbs } from "./thumbnails";

/** The part image that follows the cursor until it enters the 3D stage. */
export function DragGhost() {
  const drag = useBuilder((s) => s.drag);
  const thumb = useThumbs((s) => (drag ? s.map[drag.part] : undefined));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drag) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        el.style.transform = `translate(${pointer.x - 36}px, ${pointer.y - 36}px)`;
        el.style.opacity = pointer.inCanvas ? "0" : "1";
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [drag]);

  if (!drag) return null;
  const def = PART_BY_ID[drag.part];
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-50 grid size-[72px] place-items-center transition-opacity duration-100"
    >
      {thumb ? (
        // biome-ignore lint/performance/noImgElement: generated data URL
        <img
          src={thumb}
          alt=""
          className="size-[72px] object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.22)]"
        />
      ) : (
        <span className="rounded-full bg-ink px-2.5 py-1 text-[12px] text-white">
          {def?.name}
        </span>
      )}
    </div>
  );
}
