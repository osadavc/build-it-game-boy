"use client";

import { useEffect } from "react";
import { STEPS } from "@/lib/kit/data";
import { isStepComplete, useBuilder } from "@/lib/kit/store";
import { CloseIcon } from "./ui/icons";

const STORE_KEY = "dmg-kit-dev";

/**
 * Dev mode switch: `?dev` in the URL turns it on (and remembers it), `?dev=0`
 * turns it off, and the backtick key toggles it. While on, `[` and `]` step
 * back and forward.
 */
export function useDevMode() {
  useEffect(() => {
    const { setDev } = useBuilder.getState();
    const param = new URLSearchParams(location.search).get("dev");
    let on = false;
    try {
      if (param !== null)
        localStorage.setItem(STORE_KEY, param === "0" ? "0" : "1");
      on = localStorage.getItem(STORE_KEY) === "1";
    } catch {
      on = param !== null && param !== "0";
    }
    setDev(on);

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useBuilder.getState();
      if (e.key === "`") {
        const next = !s.dev;
        s.setDev(next);
        try {
          localStorage.setItem(STORE_KEY, next ? "1" : "0");
        } catch {
          // Not persisted; fine for a dev switch.
        }
      } else if (s.dev && (e.key === "[" || e.key === "]")) {
        const done = isStepComplete(
          s.stepIndex,
          s.filled,
          s.instances,
          s.actionsDone,
        );
        const at =
          s.stepIndex + (s.stepIndex === STEPS.length - 1 && done ? 1 : 0);
        s.jumpTo(at + (e.key === "]" ? 1 : -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Compact step skipper shown at the top of the instructions in dev mode. */
export function DevBar() {
  const dev = useBuilder((s) => s.dev);
  const stepIndex = useBuilder((s) => s.stepIndex);
  const finished = useBuilder(
    (s) =>
      s.stepIndex === STEPS.length - 1 &&
      isStepComplete(s.stepIndex, s.filled, s.instances, s.actionsDone),
  );
  const jumpTo = useBuilder((s) => s.jumpTo);
  const setDev = useBuilder((s) => s.setDev);
  if (!dev) return null;
  const at = stepIndex + (finished ? 1 : 0);
  const btn =
    "grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-[12px] text-ink-2 transition-colors hover:bg-white hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="fade-in mt-3 flex items-center gap-1 rounded-xl bg-[#f6efdc] py-1 pr-1 pl-3 text-[12px]">
      <span className="font-medium text-[#7a5a12]">Dev</span>
      <span className="ml-1.5 text-ink-3">Jump to</span>
      <select
        aria-label="Jump to step"
        value={at}
        onChange={(e) => jumpTo(Number(e.target.value))}
        className="min-w-0 flex-1 truncate bg-transparent py-1 text-[12px] text-ink outline-none"
      >
        {STEPS.map((s, i) => (
          <option key={s.id} value={i}>
            {i + 1}. {s.title}
          </option>
        ))}
        <option value={STEPS.length}>Finished</option>
      </select>
      <button
        type="button"
        title="Previous step ( [ )"
        disabled={at === 0}
        onClick={() => jumpTo(at - 1)}
        className={btn}
      >
        ‹
      </button>
      <button
        type="button"
        title="Next step ( ] )"
        disabled={at === STEPS.length}
        onClick={() => jumpTo(at + 1)}
        className={btn}
      >
        ›
      </button>
      <button
        type="button"
        title="Leave dev mode ( ` )"
        onClick={() => {
          setDev(false);
          try {
            localStorage.setItem(STORE_KEY, "0");
          } catch {
            // Not persisted; fine for a dev switch.
          }
        }}
        className={btn}
      >
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}
