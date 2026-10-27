import { create } from "zustand";
import { PART_BY_ID, SLOT_BY_ID, STEPS, TOOL_BY_ID } from "./data";
import { playSfx } from "./sfx";
import type { ToolId, Vec3 } from "./types";

export type Quat = [number, number, number, number];

export interface PartInstance {
  id: string;
  part: string;
  status: "loose" | "installing" | "installed";
  slot: string | null;
  /** World transform while loose, or where the install animation starts. */
  position: Vec3;
  quaternion: Quat;
  startedAt: number;
}

export interface DragState {
  part: string;
  /** Present when a loose part is picked up from the mat. */
  instance: string | null;
}

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "warn" | "success";
}

interface BuilderState {
  instances: Record<string, PartInstance>;
  /** slot id -> instance id */
  filled: Record<string, string>;
  stepIndex: number;
  actionsDone: Record<string, boolean>;
  activeTool: ToolId | null;
  drag: DragState | null;
  hoverSlot: string | null;
  toast: Toast | null;
  poweredOn: boolean;
  explode: number;
  /** Bumped to re-frame the camera on the current step. */
  viewNonce: number;
  /** A part (or tool) the parts list should point out after asking for a hint. */
  hint: { id: string; seq: number } | null;
  /** Name of the part under the pointer in the 3D view. */
  hovered: string | null;
  /** Undoable placements, newest last. */
  history: HistoryEntry[];
  /** A loose part the user asked to find; the bench rings it briefly. */
  ping: { id: string; seq: number } | null;

  startDrag: (part: string, instance?: string | null) => void;
  cancelDrag: () => void;
  dropLoose: (position: Vec3, quaternion: Quat) => void;
  install: (slot: string, from: Vec3, quaternion: Quat) => void;
  finishInstall: (instance: string) => void;
  completeAction: () => void;
  autoStep: () => void;
  setTool: (tool: ToolId | null) => void;
  setHoverSlot: (slot: string | null) => void;
  notify: (text: string, tone?: Toast["tone"]) => void;
  setExplode: (v: number) => void;
  resetView: () => void;
  showHint: () => void;
  setHovered: (name: string | null) => void;
  undo: () => void;
  /** Put loose bench parts back in the parts list: one part kind, or everything. */
  putBack: (part?: string) => void;
  findLoose: (part: string) => void;
  reset: () => void;
  /** Dev mode: lets the builder jump straight to any step. */
  dev: boolean;
  setDev: (on: boolean) => void;
  /** Rebuilds the kit as if every step before `index` were done (`STEPS.length` = finished). */
  jumpTo: (index: number) => void;
}

export type HistoryEntry =
  | { kind: "loose"; id: string }
  | { kind: "install"; id: string; slot: string; step: number };

let uid = 0;
const nextId = () => `i${++uid}`;

export function remainingInBin(
  part: string,
  instances: Record<string, PartInstance>,
) {
  const def = PART_BY_ID[part];
  if (!def) return 0;
  let used = 0;
  for (const id in instances) if (instances[id].part === part) used++;
  return def.qty - used;
}

export function looseCount(
  part: string,
  instances: Record<string, PartInstance>,
) {
  let n = 0;
  for (const id in instances)
    if (instances[id].part === part && instances[id].status === "loose") n++;
  return n;
}

export function openSlotsForStep(
  stepIndex: number,
  filled: Record<string, string>,
) {
  const step = STEPS[stepIndex];
  if (!step) return [];
  return step.slots.filter((s) => !filled[s]);
}

export function isStepComplete(
  stepIndex: number,
  filled: Record<string, string>,
  instances: Record<string, PartInstance>,
  actionsDone: Record<string, boolean>,
) {
  const step = STEPS[stepIndex];
  if (!step) return false;
  for (const s of step.slots) {
    const inst = filled[s];
    if (!inst || instances[inst]?.status !== "installed") return false;
  }
  if (step.action && !actionsDone[step.id]) return false;
  return true;
}

/** The pose the halves should be in: action steps change pose only once done. */
export function effectivePose(
  stepIndex: number,
  actionsDone: Record<string, boolean>,
) {
  for (let i = stepIndex; i >= 0; i--) {
    const st = STEPS[i];
    if (!st.action || actionsDone[st.id]) return st.pose;
  }
  return STEPS[0].pose;
}

let toastSeq = 0;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

export const useBuilder = create<BuilderState>((set, get) => {
  const maybeAdvance = () => {
    const s = get();
    if (!isStepComplete(s.stepIndex, s.filled, s.instances, s.actionsDone))
      return;
    if (advanceTimer) clearTimeout(advanceTimer);
    const wait = STEPS[s.stepIndex].action ? 1800 : 650;
    advanceTimer = setTimeout(() => {
      const st = get();
      if (
        isStepComplete(st.stepIndex, st.filled, st.instances, st.actionsDone)
      ) {
        if (st.stepIndex < STEPS.length - 1) {
          // Fitted parts from finished steps can't be taken back out.
          set({
            stepIndex: st.stepIndex + 1,
            hint: null,
            history: st.history.filter((h) => h.kind === "loose"),
          });
          playSfx("step");
        }
      }
    }, wait);
  };

  return {
    instances: {},
    filled: {},
    stepIndex: 0,
    actionsDone: {},
    activeTool: null,
    drag: null,
    hoverSlot: null,
    toast: null,
    poweredOn: false,
    explode: 0,
    viewNonce: 0,
    hint: null,
    hovered: null,
    history: [],
    ping: null,
    dev: false,

    startDrag: (part, instance = null) => {
      const s = get();
      let id = instance;
      if (!id && remainingInBin(part, s.instances) <= 0) {
        // Nothing left in the list: pick one up off the bench instead, so a
        // part dropped somewhere awkward is never lost.
        const loose = Object.values(s.instances).find(
          (i) => i.part === part && i.status === "loose",
        );
        if (!loose) {
          get().notify(
            `Every ${PART_BY_ID[part]?.name ?? part} is already fitted.`,
          );
          return;
        }
        id = loose.id;
      }
      set({ drag: { part, instance: id }, hovered: null });
      playSfx("pickup");
    },

    cancelDrag: () => set({ drag: null, hoverSlot: null }),

    dropLoose: (position, quaternion) => {
      const { drag, instances } = get();
      if (!drag) return;
      const id = drag.instance ?? nextId();
      set({
        drag: null,
        hoverSlot: null,
        instances: {
          ...instances,
          [id]: {
            id,
            part: drag.part,
            status: "loose",
            slot: null,
            position,
            quaternion,
            startedAt: 0,
          },
        },
        history: [
          ...get().history.filter((h) => h.id !== id),
          { kind: "loose", id },
        ],
      });
      playSfx("drop");
    },

    install: (slot, from, quaternion) => {
      const { drag, instances, filled } = get();
      if (!drag || filled[slot]) return;
      const id = drag.instance ?? nextId();
      set({
        drag: null,
        hoverSlot: null,
        filled: { ...filled, [slot]: id },
        instances: {
          ...instances,
          [id]: {
            id,
            part: drag.part,
            status: "installing",
            slot,
            position: from,
            quaternion,
            startedAt: performance.now(),
          },
        },
        history: [
          ...get().history.filter((h) => h.id !== id),
          { kind: "install", id, slot, step: get().stepIndex },
        ],
      });
    },

    finishInstall: (instance) => {
      const inst = get().instances[instance];
      if (!inst || inst.status !== "installing") return;
      set({
        instances: {
          ...get().instances,
          [instance]: { ...inst, status: "installed" },
        },
      });
      maybeAdvance();
    },

    completeAction: () => {
      const s = get();
      const step = STEPS[s.stepIndex];
      if (!step?.action) return;
      if (openSlotsForStep(s.stepIndex, s.filled).length > 0) return;
      set({
        actionsDone: { ...s.actionsDone, [step.id]: true },
        poweredOn: step.action.kind === "power" ? true : s.poweredOn,
      });
      const kind = step.action.kind;
      if (kind === "ribbon") playSfx("ribbon", { delay: 700 });
      if (kind === "close") playSfx("close", { delay: 1500 });
      if (kind === "flip") playSfx("flip", { delay: 250 });
      if (kind === "power") playSfx("switch");
      maybeAdvance();
    },

    autoStep: () => {
      const s = get();
      const step = STEPS[s.stepIndex];
      if (!step) return;
      const open = openSlotsForStep(s.stepIndex, s.filled);
      if (open.length === 0) {
        if (step.action) get().completeAction();
        return;
      }
      if (step.tool && s.activeTool !== step.tool)
        set({ activeTool: step.tool });
      // Prefer loose parts already on the mat, then take from the tray.
      const instances = { ...s.instances };
      const filled = { ...s.filled };
      const now = performance.now();
      open.forEach((slotId, i) => {
        const slot = SLOT_BY_ID[slotId];
        const loose = Object.values(instances).find(
          (it) => it.part === slot.part && it.status === "loose",
        );
        const id = loose?.id ?? nextId();
        if (!loose && remainingInBin(slot.part, instances) <= 0) return;
        instances[id] = {
          id,
          part: slot.part,
          status: "installing",
          slot: slotId,
          position: loose?.position ?? [-150, 40, 40],
          quaternion: loose?.quaternion ?? [0, 0, 0, 1],
          startedAt: now + i * 160,
        };
        filled[slotId] = id;
      });
      set({ instances, filled });
    },

    setTool: (tool) => {
      set({ activeTool: tool });
      if (tool) playSfx("tool");
    },

    setHoverSlot: (slot) => {
      if (get().hoverSlot !== slot) set({ hoverSlot: slot });
    },

    notify: (text, tone = "info") => {
      const id = ++toastSeq;
      set({ toast: { id, text, tone } });
      if (tone === "warn") playSfx("wrong");
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 2600);
    },

    setExplode: (v) => set({ explode: v }),

    resetView: () => set({ viewNonce: get().viewNonce + 1 }),

    showHint: () => {
      const s = get();
      const step = STEPS[s.stepIndex];
      const open = openSlotsForStep(s.stepIndex, s.filled);
      // The tool comes first if the step needs one and it isn't in hand.
      const id =
        step.tool && s.activeTool !== step.tool
          ? `tool:${step.tool}`
          : open.length
            ? SLOT_BY_ID[open[0]].part
            : null;
      if (!id) return;
      set({ hint: { id, seq: (s.hint?.seq ?? 0) + 1 } });
      playSfx("hint");
      const name = id.startsWith("tool:")
        ? TOOL_BY_ID[id.slice(5) as ToolId].name
        : PART_BY_ID[id].name;
      get().notify(`Look for the ${name} in the parts list.`);
    },

    setHovered: (name) => {
      if (get().hovered !== name) set({ hovered: name });
    },

    undo: () => {
      const s = get();
      if (s.drag) return;
      const history = [...s.history];
      while (history.length) {
        const h = history.pop() as HistoryEntry;
        const inst = s.instances[h.id];
        if (h.kind === "loose" && inst?.status === "loose") {
          const { [h.id]: _gone, ...instances } = s.instances;
          set({ instances, history });
          playSfx("pickup");
          get().notify(
            `${PART_BY_ID[inst.part].name} is back in the parts list.`,
          );
          return;
        }
        if (
          h.kind === "install" &&
          h.step === s.stepIndex &&
          inst &&
          inst.slot === h.slot &&
          inst.status !== "loose"
        ) {
          // Taking a part back out cancels a pending move to the next step.
          if (advanceTimer) clearTimeout(advanceTimer);
          const { [h.id]: _gone, ...instances } = s.instances;
          const { [h.slot]: _slot, ...filled } = s.filled;
          set({ instances, filled, history });
          playSfx("pickup");
          get().notify(`Took the ${PART_BY_ID[inst.part].name} back out.`);
          return;
        }
      }
      set({ history });
      get().notify("Nothing to undo.");
    },

    putBack: (part) => {
      const s = get();
      const instances = { ...s.instances };
      let n = 0;
      for (const k of Object.keys(instances)) {
        if (
          instances[k].status === "loose" &&
          (!part || instances[k].part === part)
        ) {
          delete instances[k];
          n++;
        }
      }
      if (!n) return;
      set({
        instances,
        history: s.history.filter((h) => instances[h.id]),
      });
      playSfx("pickup");
      get().notify(
        n === 1
          ? "Put back in the parts list."
          : `${n} parts put back in the parts list.`,
      );
    },

    findLoose: (part) => {
      const s = get();
      const loose = Object.values(s.instances).filter(
        (i) => i.part === part && i.status === "loose",
      );
      if (!loose.length) return;
      // Cycle through them on repeated clicks.
      const prev = s.ping ? loose.findIndex((i) => i.id === s.ping?.id) : -1;
      const next = loose[(prev + 1) % loose.length];
      set({ ping: { id: next.id, seq: (s.ping?.seq ?? 0) + 1 } });
      playSfx("hint");
    },

    setDev: (on) => set({ dev: on }),

    jumpTo: (index) => {
      if (advanceTimer) clearTimeout(advanceTimer);
      // `STEPS.length` means "all done": the last step, finished.
      const upTo = Math.max(0, Math.min(STEPS.length, index));
      const target = Math.min(upTo, STEPS.length - 1);
      const instances: Record<string, PartInstance> = {};
      const filled: Record<string, string> = {};
      const actionsDone: Record<string, boolean> = {};
      let poweredOn = false;
      for (const step of STEPS.slice(0, upTo)) {
        for (const slot of step.slots) {
          const id = nextId();
          instances[id] = {
            id,
            part: SLOT_BY_ID[slot].part,
            status: "installed",
            slot,
            position: [0, 0, 0],
            quaternion: [0, 0, 0, 1],
            startedAt: 0,
          };
          filled[slot] = id;
        }
        if (step.action) {
          actionsDone[step.id] = true;
          if (step.action.kind === "power") poweredOn = true;
        }
      }
      // Loose parts go back to the list so the counts stay right.
      set({
        instances,
        filled,
        actionsDone,
        poweredOn,
        stepIndex: target,
        activeTool: null,
        drag: null,
        hoverSlot: null,
        explode: 0,
        hint: null,
        hovered: null,
        history: [],
        ping: null,
        viewNonce: get().viewNonce + 1,
      });
    },

    reset: () => {
      if (advanceTimer) clearTimeout(advanceTimer);
      set({
        instances: {},
        filled: {},
        stepIndex: 0,
        actionsDone: {},
        activeTool: null,
        drag: null,
        hoverSlot: null,
        poweredOn: false,
        explode: 0,
        hint: null,
        hovered: null,
        history: [],
        ping: null,
      });
    },
  };
});
