"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { STEPS, TOOL_BY_ID } from "@/lib/kit/data";
import { isMuted, onMuteChange, playSfx, setMuted } from "@/lib/kit/sfx";
import { isStepComplete, useBuilder } from "@/lib/kit/store";
import { pointer, sceneRefs } from "./scene/registry";
import {
  CloseIcon,
  FrameIcon,
  MinusIcon,
  PlusIcon,
  SoundIcon,
} from "./ui/icons";

const HALF_PI = Math.PI / 2;

const FACES: {
  label: string;
  transform: string;
  az?: number;
  polar: number;
}[] = [
  { label: "Front", transform: "translateZ(30px)", az: 0, polar: HALF_PI },
  {
    label: "Back",
    transform: "rotateY(180deg) translateZ(30px)",
    az: Math.PI,
    polar: HALF_PI,
  },
  {
    label: "Right",
    transform: "rotateY(90deg) translateZ(30px)",
    az: HALF_PI,
    polar: HALF_PI,
  },
  {
    label: "Left",
    transform: "rotateY(-90deg) translateZ(30px)",
    az: -HALF_PI,
    polar: HALF_PI,
  },
  { label: "Top", transform: "rotateX(90deg) translateZ(30px)", polar: 0.0001 },
  {
    label: "Under",
    transform: "rotateX(-90deg) translateZ(30px)",
    polar: Math.PI - 0.0001,
  },
];

/** A cube that mirrors the camera; click a face to look from that side, drag to turn. */
function ViewCube() {
  const cube = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = sceneRefs.controls;
      if (c && cube.current) {
        cube.current.style.transform = `rotateX(${c.polarAngle - HALF_PI}rad) rotateY(${-c.azimuthAngle}rad)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (az: number | undefined, polar: number) => {
    const c = sceneRefs.controls;
    if (!c) return;
    // Take the short way round to the requested azimuth.
    let a = az ?? c.azimuthAngle;
    const full = Math.PI * 2;
    a =
      c.azimuthAngle +
      ((((a - c.azimuthAngle) % full) + full * 1.5) % full) -
      Math.PI;
    void c.rotateTo(a, polar, true);
  };

  return (
    <div
      className="grid size-[84px] cursor-grab touch-none place-items-center [perspective:240px] active:cursor-grabbing"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const c = sceneRefs.controls;
        if (!d || !c) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
        d.x = e.clientX;
        d.y = e.clientY;
        void c.rotate(-dx * 0.012, -dy * 0.012, false);
      }}
      onPointerUp={() => {
        setTimeout(() => {
          drag.current = null;
        }, 0);
      }}
    >
      <div
        ref={cube}
        className="relative size-[60px] [transform-style:preserve-3d]"
      >
        {FACES.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => {
              if (drag.current?.moved) return;
              go(f.az, f.polar);
            }}
            title={`View from ${f.label === "Under" ? "underneath" : f.label.toLowerCase()}`}
            className="absolute inset-0 grid place-items-center rounded-[6px] border border-ink/10 bg-white/90 text-[10.5px] text-ink-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)] transition-colors [backface-visibility:hidden] hover:bg-ink hover:text-white"
            style={{ transform: f.transform }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
      <span className="pointer-events-none absolute right-full mr-2.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ControlsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Turn", "Drag, or scroll with two fingers"],
    ["Pan", "Right-drag, Shift-drag, or Shift + two fingers"],
    ["Zoom", "Scroll wheel or pinch"],
    ["Centre on a part", "Double-click it"],
    ["Pick a side", "Click a face of the cube"],
  ];
  return (
    <div className="panel fade-in pointer-events-auto absolute right-[112px] bottom-4 w-[300px] p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[13.5px]">Moving around</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-3 hover:text-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-[12.5px]">
            <dt className="w-[92px] shrink-0 text-ink-3">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HoverLabel() {
  const hovered = useBuilder((s) => s.hovered);
  const drag = useBuilder((s) => s.drag);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hovered) return;
    let raf = 0;
    const tick = () => {
      const box = el.current?.parentElement?.getBoundingClientRect();
      if (el.current && box) {
        el.current.style.transform = `translate(${pointer.x - box.left + 14}px, ${pointer.y - box.top + 16}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [hovered]);
  if (!hovered || drag) return null;
  return (
    <div
      ref={el}
      className="pointer-events-none absolute top-0 left-0 rounded-md bg-ink px-2 py-1 text-[12px] text-white shadow-md"
    >
      {hovered}
    </div>
  );
}

export function StageOverlay() {
  const tool = useBuilder((s) => s.activeTool);
  const setTool = useBuilder((s) => s.setTool);
  const toast = useBuilder((s) => s.toast);
  const resetView = useBuilder((s) => s.resetView);
  const explode = useBuilder((s) => s.explode);
  const setExplode = useBuilder((s) => s.setExplode);
  const finished = useBuilder(
    (s) =>
      s.stepIndex === STEPS.length - 1 &&
      isStepComplete(s.stepIndex, s.filled, s.instances, s.actionsDone),
  );
  const [help, setHelp] = useState(false);
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    setMutedState(isMuted());
    return onMuteChange(setMutedState);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      {toast && (
        <div
          key={toast.id}
          className="rise absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] text-white shadow-lg"
        >
          {toast.text}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-2">
        <BenchControls />
        {tool && (
          <div className="fade-in pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-1.5 pl-3.5 text-[12.5px] shadow-[0_0_0_1px_var(--hair),0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur">
            <span className="text-ink-3">In hand</span>
            <span>{TOOL_BY_ID[tool].name}</span>
            <button
              type="button"
              onClick={() => setTool(null)}
              aria-label="Put the tool down"
              className="grid size-6 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {finished && (
        <label className="fade-in pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/90 py-2 pr-4 pl-4 text-[12.5px] shadow-[0_0_0_1px_var(--hair),0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur">
          <span className="text-ink-2">Exploded view</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (explode < 0.05 && v >= 0.05) playSfx("explode");
              setExplode(v);
            }}
            className="w-36 accent-[#18181a]"
          />
        </label>
      )}

      <div className="pointer-events-auto absolute right-4 bottom-4 flex items-end gap-2">
        <div className="flex flex-col items-center gap-0.5 rounded-full bg-white/90 p-1 shadow-[0_0_0_1px_var(--hair),0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur">
          <RoundButton
            label="Zoom in"
            onClick={() => void sceneRefs.controls?.dolly(60, true)}
          >
            <PlusIcon className="size-4" />
          </RoundButton>
          <RoundButton
            label="Zoom out"
            onClick={() => void sceneRefs.controls?.dolly(-60, true)}
          >
            <MinusIcon className="size-4" />
          </RoundButton>
          <RoundButton label="Back to this step's view" onClick={resetView}>
            <FrameIcon className="size-4" />
          </RoundButton>
          <RoundButton
            label={muted ? "Sound off" : "Sound on"}
            onClick={() => setMuted(!muted)}
          >
            <SoundIcon className="size-4" muted={muted} />
          </RoundButton>
          <RoundButton
            label="How to move around"
            onClick={() => setHelp((h) => !h)}
          >
            <span className="font-medium text-[13px]">?</span>
          </RoundButton>
        </div>
        <ViewCube />
      </div>
      {help && <ControlsHelp onClose={() => setHelp(false)} />}
      <HoverLabel />
      <EmptyBench />
    </div>
  );
}

/** Undo plus a way back for anything lying loose on the bench. */
function BenchControls() {
  const canUndo = useBuilder((s) => s.history.length > 0 && !s.drag);
  const undo = useBuilder((s) => s.undo);
  const putBack = useBuilder((s) => s.putBack);
  const loose = useBuilder(
    (s) =>
      Object.values(s.instances).filter((i) => i.status === "loose").length,
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        useBuilder.getState().undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (!canUndo && !loose) return null;
  const chip =
    "fade-in pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-1.5 pl-3.5 text-[12.5px] shadow-[0_0_0_1px_var(--hair),0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur";
  const action =
    "h-7 rounded-full bg-surface-2 px-3 text-[12px] text-ink transition-colors hover:bg-[#e8e7e2]";
  return (
    <>
      {loose > 0 && (
        <div className={chip}>
          <span className="text-ink-2">
            {loose === 1 ? "1 part" : `${loose} parts`} lying on the bench
          </span>
          <button type="button" onClick={() => putBack()} className={action}>
            Put back
          </button>
        </div>
      )}
      {canUndo && (
        <div className={chip}>
          <span className="text-ink-3">Placed it wrong?</span>
          <button type="button" onClick={undo} className={action}>
            Undo{" "}
            <span className="ml-1 text-ink-3">
              {typeof navigator !== "undefined" &&
              /Mac|iP/.test(navigator.platform)
                ? "⌘Z"
                : "Ctrl+Z"}
            </span>
          </button>
        </div>
      )}
    </>
  );
}

/** Before anything is on the bench, say how to begin. */
function EmptyBench() {
  const empty = useBuilder(
    (s) => Object.keys(s.instances).length === 0 && !s.drag,
  );
  if (!empty) return null;
  return (
    <div className="fade-in absolute inset-x-0 top-[42%] text-center">
      <p className="text-[15px] text-ink-2">
        Find the part the first step asks for
      </p>
      <p className="mt-1 text-[13px] text-ink-3">
        and drag it from the parts list onto the bench.
      </p>
    </div>
  );
}
