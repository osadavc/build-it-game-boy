import { MeshStandardMaterial } from "three";
import { buildScrew, type ScrewSpec } from "./screw-geometry";

/** Nintendo 21826: M2 × 8.2 self-tapping tri-wing (Y-type), bright nickel. */
export const TRIWING_SPEC: ScrewSpec = {
  drive: "triwing",
  head: "pan",
  headD: 3.8,
  headH: 1.4,
  d: 2.0,
  length: 8.2,
  pitch: 0.9,
  pointed: true,
};

/** Nintendo 18420: M2 × 7 Phillips pan head, yellow-zinc ("gold"). */
export const PHILLIPS_SPEC: ScrewSpec = {
  drive: "phillips",
  head: "pan",
  headD: 3.5,
  headH: 1.3,
  d: 2.0,
  length: 7.0,
  pitch: 0.9,
  pointed: true,
};

const silver = new MeshStandardMaterial({
  color: "#c9ccd1",
  roughness: 0.26,
  metalness: 1,
});
const gold = new MeshStandardMaterial({
  color: "#c9a23a",
  roughness: 0.3,
  metalness: 1,
});

export const buildTriwingScrew = () => buildScrew(TRIWING_SPEC, silver);
export const buildPhillipsScrew = () => buildScrew(PHILLIPS_SPEC, gold);
