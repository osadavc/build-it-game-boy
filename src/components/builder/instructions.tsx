"use client";

import { useEffect, useRef, useState } from "react";
import { PART_BY_ID, SLOT_BY_ID, STEPS, TOOL_BY_ID } from "@/lib/kit/data";
import { isStepComplete, useBuilder } from "@/lib/kit/store";
import type { StepDef } from "@/lib/kit/types";
import { DevBar } from "./dev-bar";
import { CheckIcon } from "./ui/icons";

function Needs({ step, live }: { step: StepDef; live: boolean }) {
  const filled = useBuilder((s) => s.filled);
  const instances = useBuilder((s) => s.instances);
  const activeTool = useBuilder((s) => s.activeTool);
  const needs = new Map<string, { total: number; done: number }>();
  for (const id of step.slots) {
    const part = SLOT_BY_ID[id].part;
    const n = needs.get(part) ?? { total: 0, done: 0 };
    n.total++;
    const inst = filled[id];
    if (live && inst && instances[inst]?.status === "installed") n.done++;
    needs.set(part, n);
  }
  if (!needs.size && !step.tool) return null;
  return (
    <div className="mt-4 rounded-xl bg-surface-2 px-3.5 py-2.5">
      <div className="text-[11.5px] text-ink-3">You'll need</div>
      <ul className="mt-1.5 space-y-1">
        {[...needs].map(([part, n]) => (
          <li
            key={part}
            className="flex items-baseline justify-between gap-3 text-[13px]"
          >
            <span
              className={
                n.done === n.total && live
                  ? "text-ink-3 line-through decoration-ink-3/40"
                  : ""
              }
            >
              {PART_BY_ID[part].name}
              {n.total > 1 ? ` × ${n.total}` : ""}
            </span>
            {live && n.total > 1 && (
              <span className="text-[12px] text-ink-3 tabular-nums">
                {n.done}/{n.total}
              </span>
            )}
          </li>
        ))}
        {step.tool && (
          <li className="flex items-baseline justify-between gap-3 text-[13px]">
            <span>{TOOL_BY_ID[step.tool].name}</span>
            {live && (
              <span
                className={`text-[12px] ${activeTool === step.tool ? "text-ok" : "text-ink-3"}`}
              >
                {activeTool === step.tool ? "In hand" : "Tool"}
              </span>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

function StepDetail({ step, live }: { step: StepDef; live: boolean }) {
  const stepIndex = useBuilder((s) => s.stepIndex);
  const filled = useBuilder((s) => s.filled);
  const instances = useBuilder((s) => s.instances);
  const actionsDone = useBuilder((s) => s.actionsDone);
  const completeAction = useBuilder((s) => s.completeAction);
  const showHint = useBuilder((s) => s.showHint);
  const reset = useBuilder((s) => s.reset);
  const complete =
    live && isStepComplete(stepIndex, filled, instances, actionsDone);
  const slotsDone = step.slots.every((s) => filled[s]);
  const last = stepIndex === STEPS.length - 1;
  const info = step.bullets.filter((b) => b.tone === "info");
  const caution = step.bullets.find((b) => b.tone === "caution");
  const note = step.bullets.find((b) => b.tone === "note");

  return (
    <div className="fade-in pt-1 pb-4 pl-9">
      <div className="space-y-2 text-[13.5px] text-ink-2 leading-[1.55]">
        {info.map((b) => (
          <p key={b.text}>{b.text}</p>
        ))}
      </div>
      {caution && (
        <p className="mt-3 border-signal/60 border-l-2 pl-3 text-[13px] text-ink leading-[1.5]">
          {caution.text}
        </p>
      )}
      {note && (
        <p className="mt-3 text-[12.5px] text-ink-3 leading-[1.5]">
          {note.text}
        </p>
      )}
      <Needs step={step} live={live} />
      {live && (
        <div className="mt-4 flex items-center gap-3">
          {step.action && !actionsDone[step.id] && (
            <button
              type="button"
              disabled={!slotsDone}
              onClick={completeAction}
              className="h-9 rounded-full bg-ink px-4 font-medium text-[13px] text-white transition-[opacity,transform] enabled:hover:opacity-90 enabled:active:scale-[0.98] disabled:opacity-30"
            >
              {step.action.label}
            </button>
          )}
          {!complete && !slotsDone && (
            <button
              type="button"
              data-step-open
              onClick={showHint}
              className="text-[12.5px] text-ink-3 underline decoration-ink-3/40 underline-offset-[3px] transition-colors hover:text-ink"
            >
              Can't find it?
            </button>
          )}
          {complete && last && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Take it all apart and start again?")) reset();
              }}
              className="h-9 rounded-full bg-surface-2 px-4 text-[13px] transition-colors hover:bg-[#e8e7e2]"
            >
              Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Instructions() {
  const stepIndex = useBuilder((s) => s.stepIndex);
  const finished = useBuilder(
    (s) =>
      s.stepIndex === STEPS.length - 1 &&
      isStepComplete(s.stepIndex, s.filled, s.instances, s.actionsDone),
  );
  const [open, setOpen] = useState(stepIndex);
  const listRef = useRef<HTMLOListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  // Follow the build: open the new step, then (after the old one has
  // collapsed) bring it to the top of the list.
  useEffect(() => {
    setOpen(stepIndex);
  }, [stepIndex]);
  useEffect(() => {
    if (open !== stepIndex) return;
    const raf = requestAnimationFrame(() => {
      const el = items.current[stepIndex];
      const list = listRef.current;
      if (el && list)
        list.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, stepIndex]);

  const done = stepIndex + (finished ? 1 : 0);

  return (
    <aside
      className="panel flex min-h-0 flex-col"
      data-current-step={stepIndex + 1}
    >
      <header className="px-5 pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-[15px]">Instructions</h2>
          <span className="text-[12px] text-ink-3 tabular-nums">
            {done} of {STEPS.length} done
          </span>
        </div>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-hair">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-700 ease-out"
            style={{ width: `${(done / STEPS.length) * 100}%` }}
          />
        </div>
        <DevBar />
      </header>
      <ol
        ref={listRef}
        className="relative mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-6"
      >
        {STEPS.map((s, i) => {
          const state =
            i < stepIndex || (finished && i === stepIndex)
              ? "done"
              : i === stepIndex
                ? "now"
                : "todo";
          return (
            <li
              key={s.id}
              ref={(el) => {
                items.current[i] = el;
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                className={`flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                  open === i ? "" : "hover:bg-surface-2"
                }`}
              >
                <span
                  className={`mt-px grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] tabular-nums ${
                    state === "done"
                      ? "bg-ok/12 text-ok"
                      : state === "now"
                        ? "bg-ink text-white"
                        : "text-ink-3 ring-1 ring-ink/12 ring-inset"
                  }`}
                >
                  {state === "done" ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-[14px] leading-[1.35] ${
                    state === "now"
                      ? "font-semibold text-ink"
                      : state === "done"
                        ? "text-ink-3"
                        : "text-ink-2"
                  }`}
                >
                  {s.title}
                </span>
              </button>
              {open === i && <StepDetail step={s} live={i === stepIndex} />}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
