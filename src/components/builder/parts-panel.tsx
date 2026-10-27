"use client";

import {
  type ComponentType,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from "react";
import { PARTS, TOOLS } from "@/lib/kit/data";
import { looseCount, remainingInBin, useBuilder } from "@/lib/kit/store";
import type { PartCategory, PartDef, ToolDef, ToolId } from "@/lib/kit/types";
import { useThumbs } from "./thumbnails";
import {
  CheckIcon,
  Mark,
  PhillipsIcon,
  SearchIcon,
  SpudgerIcon,
  TriWingIcon,
} from "./ui/icons";
import { Thumb, useDragOrClick } from "./ui/part-tile";

const ORDER: PartCategory[] = [
  "Housing",
  "Display",
  "Boards",
  "Controls",
  "Audio",
  "Power",
  "Fasteners",
  "Extras",
];

const toolGlyph: Record<ToolId, ComponentType<SVGProps<SVGSVGElement>>> = {
  triwing: TriWingIcon,
  phillips: PhillipsIcon,
  spudger: SpudgerIcon,
};

/** Scrolls a row into view and flashes it when it's the current hint. */
function useHinted(id: string) {
  const hint = useBuilder((s) => s.hint);
  const ref = useRef<HTMLLIElement>(null);
  const on = hint?.id === id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run for each new hint
  useEffect(() => {
    if (on)
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [on, hint?.seq]);
  return { ref, on };
}

function ToolRow({ tool }: { tool: ToolDef }) {
  const active = useBuilder((s) => s.activeTool === tool.id);
  const setTool = useBuilder((s) => s.setTool);
  const { ref, on } = useHinted(`tool:${tool.id}`);
  const G = toolGlyph[tool.id];
  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={() => setTool(active ? null : tool.id)}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${
          on ? "hint-flash" : "hover:bg-surface-2"
        }`}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg transition-colors ${
            active ? "bg-ink text-white" : "bg-surface-2 text-ink"
          }`}
        >
          <G className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] leading-tight">{tool.name}</span>
          <span className="mt-0.5 block text-[12px] text-ink-3">
            {tool.tip}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] transition-colors ${
            active ? "bg-ink text-white" : "text-ink-3"
          }`}
        >
          {active ? "In hand" : "Pick up"}
        </span>
      </button>
    </li>
  );
}

function PartRow({
  def,
  open,
  onToggle,
}: {
  def: PartDef;
  open: boolean;
  onToggle: () => void;
}) {
  const inTray = useBuilder((s) => remainingInBin(def.id, s.instances));
  const onBench = useBuilder((s) => looseCount(def.id, s.instances));
  const findLoose = useBuilder((s) => s.findLoose);
  const putBack = useBuilder((s) => s.putBack);
  const onPointerDown = useDragOrClick(def.id, onToggle);
  const { ref, on } = useHinted(def.id);
  // Parts lying loose on the bench still count: they can be picked up from here.
  const left = inTray + onBench;
  const out = left <= 0;
  return (
    <li ref={ref}>
      <button
        type="button"
        onPointerDown={out ? undefined : onPointerDown}
        onClick={out ? onToggle : undefined}
        className={`flex w-full touch-none items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${
          on ? "hint-flash" : open ? "bg-surface-2" : "hover:bg-surface-2"
        } ${out ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2">
          <Thumb k={def.id} className={`size-9 ${out ? "opacity-35" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13.5px] leading-tight ${out ? "text-ink-3" : ""}`}
          >
            {def.name}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-3">
            {def.spec}
          </span>
        </span>
        {out ? (
          <CheckIcon className="size-4 shrink-0 text-ok" />
        ) : (
          <span className="shrink-0 text-[12.5px] text-ink-3 tabular-nums">
            {left}
          </span>
        )}
      </button>
      {onBench > 0 && (
        <div className="fade-in flex items-center gap-2 pr-2 pb-1.5 pl-[60px] text-[12px]">
          <span className="text-[#a87610]">{onBench} on the bench</span>
          <span className="text-ink-3/50">·</span>
          <button
            type="button"
            onClick={() => findLoose(def.id)}
            className="text-ink-2 underline decoration-ink-3/40 underline-offset-[3px] hover:text-ink"
          >
            Find
          </button>
          <button
            type="button"
            onClick={() => putBack(def.id)}
            className="text-ink-2 underline decoration-ink-3/40 underline-offset-[3px] hover:text-ink"
          >
            Put back
          </button>
        </div>
      )}
      {open && (
        <div className="fade-in px-2 pt-1 pb-3">
          <p className="text-[12.5px] text-ink-2 leading-[1.55]">
            {def.description}
          </p>
          <dl className="mt-2.5 divide-y divide-hair border-hair border-y">
            {def.marking && (
              <div className="flex justify-between gap-4 py-1.5 text-[12px]">
                <dt className="text-ink-3">Marking</dt>
                <dd className="text-right">{def.marking}</dd>
              </div>
            )}
            {def.facts.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 py-1.5 text-[12px]"
              >
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}

/** Pixel-art portrait of the finished Game Boy, rendered from the model at 2×. */
function Portrait() {
  const src = useThumbs((s) => s.map.portrait);
  return (
    <div className="grid h-[88px] w-[56px] shrink-0 place-items-center">
      {src ? (
        // biome-ignore lint/performance/noImgElement: generated data URL
        <img
          src={src}
          alt="The finished Game Boy"
          width={56}
          height={88}
          draggable={false}
          className="fade-in h-[88px] w-[56px] [image-rendering:pixelated]"
        />
      ) : (
        <Mark className="h-8 w-auto text-ink/20" />
      )}
    </div>
  );
}

export function PartsPanel() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const match = (...fields: (string | undefined)[]) =>
    !q || fields.some((f) => f?.toLowerCase().includes(q));
  const tools = TOOLS.filter((t) => match(t.name, t.tip, "tool"));
  const total = PARTS.reduce((n, p) => n + p.qty, 0);

  return (
    <aside className="panel flex min-h-0 flex-col">
      <div className="flex items-center gap-4 px-5 pt-5">
        <Portrait />
        <div className="leading-tight">
          <div className="font-semibold text-[15px] tracking-[-0.01em]">
            DMG-01
          </div>
          <div className="mt-0.5 text-[12.5px] text-ink-3">
            Build kit · 1989
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-baseline justify-between px-5">
        <h2 className="font-semibold text-[15px]">Parts</h2>
        <span className="text-[12px] text-ink-3 tabular-nums">
          {total} pieces
        </span>
      </div>
      <label className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-ink-3 focus-within:ring-1 focus-within:ring-ink/20">
        <SearchIcon className="size-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a part"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tools.length > 0 && (
          <section className="mt-2">
            <h3 className="px-2 pt-2 pb-1 text-[12px] text-ink-3">Tools</h3>
            <ul>
              {tools.map((t) => (
                <ToolRow key={t.id} tool={t} />
              ))}
            </ul>
          </section>
        )}
        {ORDER.map((cat) => {
          const items = PARTS.filter(
            (p) =>
              p.category === cat &&
              match(p.name, p.spec, p.marking, p.category),
          );
          if (!items.length) return null;
          return (
            <section key={cat} className="mt-2">
              <h3 className="px-2 pt-2 pb-1 text-[12px] text-ink-3">{cat}</h3>
              <ul>
                {items.map((p) => (
                  <PartRow
                    key={p.id}
                    def={p}
                    open={open === p.id}
                    onToggle={() => setOpen(open === p.id ? null : p.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {q &&
          tools.length === 0 &&
          !PARTS.some((p) => match(p.name, p.spec, p.marking, p.category)) && (
            <p className="px-2 pt-6 text-[13px] text-ink-3">
              Nothing called “{query}”.
            </p>
          )}
      </div>
    </aside>
  );
}
