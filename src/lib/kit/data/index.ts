import { TOOL_DEFS } from "../parts/tools";
import type { PartDef, SlotDef, ToolDef, ToolId } from "../types";
import { PARTS } from "./parts";
import { SLOTS } from "./slots";
import { STEPS } from "./steps";

export { LAYOUT, POSES } from "./poses";
export { PARTS, SLOTS, STEPS };
export const TOOLS = TOOL_DEFS;

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
);
export const SLOT_BY_ID: Record<string, SlotDef> = Object.fromEntries(
  SLOTS.map((s) => [s.id, s]),
);
export const TOOL_BY_ID = Object.fromEntries(
  TOOL_DEFS.map((t) => [t.id, t]),
) as Record<ToolId, ToolDef>;

// Every step slot must exist, and every slot belongs to exactly one step.
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const st of STEPS) {
    for (const s of st.slots) {
      if (!SLOT_BY_ID[s])
        console.warn(`[kit] step ${st.id} references missing slot ${s}`);
      if (seen.has(s)) console.warn(`[kit] slot ${s} used by two steps`);
      seen.add(s);
    }
  }
  for (const s of SLOTS) {
    if (!seen.has(s.id)) console.warn(`[kit] slot ${s.id} is not in any step`);
    if (!PART_BY_ID[s.part])
      console.warn(`[kit] slot ${s.id} uses unknown part ${s.part}`);
  }
  for (const p of PARTS) {
    const n = SLOTS.filter((s) => s.part === p.id).length;
    if (n !== p.qty)
      console.warn(`[kit] part ${p.id}: qty ${p.qty} but ${n} slots`);
  }
}
