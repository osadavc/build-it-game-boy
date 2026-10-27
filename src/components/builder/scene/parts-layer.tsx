import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  type Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from "three";
import { PART_BY_ID, SLOT_BY_ID, STEPS } from "@/lib/kit/data";
import {
  clonePart,
  getToolPrototype,
  ghostMaterials,
  ghostOf,
  restInfo,
} from "@/lib/kit/prototypes";
import { playSfx, type SfxEvent } from "@/lib/kit/sfx";
import { type PartInstance, useBuilder } from "@/lib/kit/store";
import type { GroupId } from "@/lib/kit/types";
import { clamp01, easeInOut, easeOut } from "./pose-math";
import { focusPoint, updatePointer } from "./registry";
import { approachOf, previewLift, slotWorld } from "./slot-math";

/* ------------------------------------------------------------------ */
/* Installed parts live inside their assembly group (device frame).    */
/* ------------------------------------------------------------------ */

/**
 * Exploded-diagram offsets along device Z (mm at full explode), ordered like
 * Nintendo's service-manual exploded view: lens in front, cover at the back.
 */
const EXPLODE_BY_PART: Record<string, number> = {
  lens: 100,
  "front-shell": 74,
  dpad: 54,
  "ab-button": 54,
  gasket: 44,
  "rubber-dpad": 36,
  "rubber-ab": 36,
  "start-select": 36,
  speaker: 36,
  "lcd-board": 18,
  "cpu-board": -20,
  "dcdc-board": -20,
  "jack-board": -20,
  "power-actuator": -30,
  "guard-plate": -38,
  "back-shell": -64,
  "bridge-contact": -74,
  "aa-battery": -84,
  "battery-cover": -118,
  cartridge: -50,
};

function explodeOffset(slotId: string) {
  const s = SLOT_BY_ID[slotId];
  if (slotId.startsWith("lcd-screw")) return 6;
  if (slotId.startsWith("cpu-screw") || slotId.startsWith("jack-screw"))
    return -8;
  if (slotId.startsWith("guard-screw")) return -30;
  if (slotId.startsWith("case-screw")) return -100;
  return EXPLODE_BY_PART[s.part] ?? 0;
}

function InstalledPart({ inst }: { inst: PartInstance }) {
  const slot = inst.slot ? SLOT_BY_ID[inst.slot] : null;
  const obj = useMemo(() => clonePart(inst.part) as Group, [inst.part]);
  const ref = useRef<Group>(null);
  const power = useRef(0);
  const knob = useMemo(() => obj.getObjectByName("sw-knob") ?? null, [obj]);
  const knobX = useMemo(() => knob?.position.x ?? 0, [knob]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || !slot) return;
    const s = useBuilder.getState();
    // Exploded view: each layer slides out along device Z; the cartridge also rises.
    const e = s.explode * s.explode * (3 - 2 * s.explode);
    g.position.set(
      slot.position[0],
      slot.position[1] + (slot.part === "cartridge" ? 40 * e : 0),
      slot.position[2] + explodeOffset(slot.id) * e,
    );
    // Power switch: the actuator slides 5.35 mm toward +X; the switch nub follows.
    const target = s.poweredOn ? 1 : 0;
    power.current += (target - power.current) * Math.min(1, dt * 10);
    if (slot.id === "power-actuator") g.position.x += 5.35 * power.current;
    if (knob) knob.position.x = knobX + 3.5 * power.current;
  });

  const setHovered = useBuilder((s) => s.setHovered);
  const switchable = useBuilder(
    (s) =>
      slot?.id === "power-actuator" &&
      STEPS[s.stepIndex].action?.kind === "power" &&
      !s.actionsDone[STEPS[s.stepIndex].id],
  );
  const completeAction = useBuilder((s) => s.completeAction);

  if (!slot) return null;
  const name = PART_BY_ID[slot.part].name;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a three.js object, not DOM
    <primitive
      ref={ref}
      object={obj}
      position={slot.position}
      rotation={slot.rotation ?? [0, 0, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(switchable ? "Power switch — click to slide it ON" : name);
        if (switchable) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = "";
      }}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        focusPoint(e.point);
      }}
      onClick={
        switchable
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              if (e.delta <= 4) completeAction();
            }
          : undefined
      }
    />
  );
}

export function InstalledParts({ group }: { group: GroupId }) {
  const instances = useBuilder((s) => s.instances);
  return (
    <>
      {Object.values(instances)
        .filter(
          (i) =>
            i.status === "installed" &&
            i.slot &&
            SLOT_BY_ID[i.slot].group === group,
        )
        .map((i) => (
          <InstalledPart key={i.id} inst={i} />
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ghosts: translucent previews of where the current step's parts go. */
/* ------------------------------------------------------------------ */

const markerGeo = new RingGeometry(2.6, 3.4, 40);
const markerMat = new MeshBasicMaterial({
  color: "#3f49c9",
  transparent: true,
  opacity: 0.8,
  depthTest: false,
});

function Ghost({ slotId, active }: { slotId: string; active: boolean }) {
  const slot = SLOT_BY_ID[slotId];
  const obj = useMemo(() => {
    const g = ghostOf(slot.part, ghostMaterials.idle);
    // Tiny parts (screws) get a halo so they can be found.
    if (PART_BY_ID[slot.part].category === "Fasteners") {
      const ring = new Mesh(markerGeo, markerMat);
      ring.renderOrder = 10;
      ring.name = "marker";
      ring.raycast = () => {};
      ring.layers.set(1);
      g.add(ring);
    }
    return g;
  }, [slot.part]);
  const snapObj = useMemo(
    () => ghostOf(slot.part, ghostMaterials.snap),
    [slot.part],
  );
  return (
    <primitive
      object={active ? snapObj : obj}
      position={slot.position}
      rotation={slot.rotation ?? [0, 0, 0]}
    />
  );
}

export function Ghosts({ group }: { group: GroupId }) {
  const stepIndex = useBuilder((s) => s.stepIndex);
  const filled = useBuilder((s) => s.filled);
  const hover = useBuilder((s) => s.hoverSlot);
  const drag = useBuilder((s) => s.drag);
  const step = STEPS[stepIndex];
  const open = step.slots.filter(
    (s) => !filled[s] && SLOT_BY_ID[s].group === group,
  );
  // Outlines only appear once the right part is in hand: finding it is the user's job.
  const shown = drag
    ? open.filter((s) => SLOT_BY_ID[s].part === drag.part)
    : [];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ghostMaterials.idle.opacity = 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3.2));
    markerMat.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.2));
  });
  return (
    <>
      {shown.map((s) => (
        <Ghost key={s} slotId={s} active={hover === s} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Loose parts lying on the mat; can be picked up again.               */
/* ------------------------------------------------------------------ */

function LoosePart({ inst, hidden }: { inst: PartInstance; hidden: boolean }) {
  const obj = useMemo(() => clonePart(inst.part), [inst.part]);
  const startDrag = useBuilder((s) => s.startDrag);
  const setHovered = useBuilder((s) => s.setHovered);
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    updatePointer(e.clientX, e.clientY);
    startDrag(inst.part, inst.id);
  };
  return (
    <primitive
      object={obj}
      visible={!hidden}
      position={inst.position}
      quaternion={inst.quaternion}
      onPointerDown={onDown}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(PART_BY_ID[inst.part].name);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = "";
      }}
    />
  );
}

const pingGeo = new RingGeometry(0.88, 1, 64);
pingGeo.rotateX(-Math.PI / 2);
const pingMat = new MeshBasicMaterial({
  color: "#e0a526",
  transparent: true,
  depthTest: false,
});

/** "Find" on a parts-list row: fly to that loose part and ring it on the bench. */
function PingRing() {
  const ping = useBuilder((s) => s.ping);
  const inst = useBuilder((s) => (s.ping ? s.instances[s.ping.id] : undefined));
  const ref = useRef<Mesh>(null);
  const started = useRef(0);
  const radius = useMemo(() => {
    if (!inst) return 10;
    const size = restInfo(inst.part).size;
    return Math.max(9, Math.hypot(size.x, size.z) / 2 + 5);
  }, [inst]);

  // The ring belongs to the camera only, not to the floor's contact shadow.
  useEffect(() => {
    ref.current?.layers.set(1);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new ping refocuses
  useEffect(() => {
    if (!ping || !inst || inst.status !== "loose") return;
    started.current = performance.now();
    focusPoint(new Vector3(...inst.position));
  }, [ping?.seq]);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - started.current) / 2600;
    m.visible = !!inst && inst.status === "loose" && t < 1;
    if (!m.visible) return;
    const pulse = 1 + 0.12 * Math.sin(t * Math.PI * 6);
    m.scale.setScalar(radius * pulse);
    pingMat.opacity = 0.9 * (1 - t * t);
  });

  if (!inst) return null;
  return (
    <mesh
      ref={ref}
      geometry={pingGeo}
      material={pingMat}
      position={[inst.position[0], 0.3, inst.position[2]]}
      renderOrder={20}
      raycast={() => null}
    />
  );
}

export function LooseParts() {
  const instances = useBuilder((s) => s.instances);
  const drag = useBuilder((s) => s.drag);
  return (
    <>
      <PingRing />
      {Object.values(instances)
        .filter((i) => i.status === "loose")
        .map((i) => (
          <LoosePart key={i.id} inst={i} hidden={drag?.instance === i.id} />
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Parts travelling into their slot (screws spin down with a driver).  */
/* ------------------------------------------------------------------ */

const BOARDS = new Set([
  "lcd-board",
  "cpu-board",
  "dcdc-board",
  "jack-board",
  "guard-plate",
]);

function seatSound(part: string): SfxEvent {
  if (BOARDS.has(part)) return "seat-board";
  if (part === "aa-battery" || part === "bridge-contact") return "battery";
  return "snap";
}

function InstallingPart({ inst }: { inst: PartInstance }) {
  const slotId = inst.slot as string;
  const slot = SLOT_BY_ID[slotId];
  const obj = useMemo(() => clonePart(inst.part), [inst.part]);
  const tool = useMemo(
    () => (slot.tool ? getToolPrototype(slot.tool).clone(true) : null),
    [slot.tool],
  );
  const ref = useRef<Group>(null);
  const toolRef = useRef<Group>(null);
  const finish = useBuilder((s) => s.finishInstall);
  const done = useRef(false);
  const seating = useRef(false);
  const tmp = useMemo(
    () => ({
      start: new Vector3(...inst.position),
      startQ: new Quaternion(...inst.quaternion),
      seat: new Vector3(),
      seatQ: new Quaternion(),
      hover: new Vector3(),
      hoverQ: new Quaternion(),
      spinQ: new Quaternion(),
      axis: new Vector3(0, 0, 1),
      p: new Vector3(),
    }),
    [inst.position, inst.quaternion],
  );
  const spin = slot.spin ?? 0;
  const seatTime = spin ? 900 : slot.slide ? 560 : 160;
  // Released over its spot, a part is already in place: no travel. From
  // further away (the dev auto-step) it glides straight there, never arcing.
  const travel = useRef<number | null>(null);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = approachOf(slotId);
    const hoverDist = previewLift(slotId);
    slotWorld(slotId, tmp.seat, tmp.seatQ);
    slotWorld(
      slotId,
      tmp.hover,
      tmp.hoverQ,
      a.clone().multiplyScalar(-hoverDist),
    );
    travel.current ??= Math.min(420, tmp.start.distanceTo(tmp.hover) * 2.4);
    const glide = travel.current;
    const el = performance.now() - inst.startedAt;
    if (el < 0) {
      g.position.copy(tmp.start);
      g.quaternion.copy(tmp.startQ);
      return;
    }
    if (el < glide) {
      const t = easeInOut(clamp01(el / glide));
      g.position.lerpVectors(tmp.start, tmp.hover, t);
      g.quaternion.slerpQuaternions(tmp.startQ, tmp.seatQ, t);
      if (spin) {
        tmp.spinQ.setFromAxisAngle(tmp.axis, spin * Math.PI * 2);
        g.quaternion.multiply(tmp.spinQ);
      }
    } else {
      if (!seating.current) {
        seating.current = true;
        if (spin) playSfx("screw");
      }
      const t = clamp01((el - glide) / seatTime);
      const e = spin ? t : slot.slide ? easeInOut(t) : easeOut(t);
      g.position.lerpVectors(tmp.hover, tmp.seat, e);
      g.quaternion.copy(tmp.seatQ);
      if (spin) {
        tmp.spinQ.setFromAxisAngle(tmp.axis, spin * Math.PI * 2 * (1 - e));
        g.quaternion.multiply(tmp.spinQ);
      }
      if (t >= 1 && !done.current) {
        done.current = true;
        if (!spin) playSfx(seatSound(inst.part));
        finish(inst.id);
      }
    }
    const tg = toolRef.current;
    if (tg) {
      // The driver bit rides on the screw head; screws have their head at local z=0.
      tg.visible = el >= glide * 0.6;
      tg.position.copy(g.position);
      tg.quaternion.copy(g.quaternion);
    }
  });

  return (
    <>
      <primitive ref={ref} object={obj} />
      {tool && <primitive ref={toolRef} object={tool} />}
    </>
  );
}

export function InstallingParts() {
  const instances = useBuilder((s) => s.instances);
  return (
    <>
      {Object.values(instances)
        .filter((i) => i.status === "installing")
        .map((i) => (
          <InstallingPart key={i.id} inst={i} />
        ))}
    </>
  );
}
