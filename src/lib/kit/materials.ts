import {
  type Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
} from "three";

const cache = new Map<string, Material>();

function std(key: string, p: MeshStandardMaterialParameters) {
  let m = cache.get(key) as MeshStandardMaterial | undefined;
  if (!m) {
    m = new MeshStandardMaterial(p);
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

/** Colour palette (sRGB) sampled from reference photos of a DMG-01. */
export const COLORS = {
  shell: "#c3c0b9",
  shellInner: "#b9b6ae",
  batteryCover: "#c3c0b9",
  lensFrame: "#5b5c6a",
  dpad: "#2d2c31",
  abButton: "#8b1d4b",
  startSelect: "#8f8e8c",
  membrane: "#3a3a3c",
  carbon: "#151515",
  print: "#2b2f86",
  pcb: "#3c6b45",
  pcbDark: "#2c5236",
  silk: "#f1efe2",
  copper: "#c79a4c",
  solder: "#c9cbcd",
  ic: "#1e1e20",
  icText: "#c8c8c8",
  steel: "#b9bdc2",
  nickel: "#d3d3cf",
  speakerCone: "#2b2a28",
  speakerFrame: "#a8aaac",
  ribbon: "#c98a2d",
  lcdGlass: "#a0a98a",
  cart: "#a9a7a2",
  battery: "#25262a",
} as const;

export const M = {
  shell: () =>
    std("shell", { color: COLORS.shell, roughness: 0.62, metalness: 0 }),
  shellInner: () =>
    std("shellInner", { color: COLORS.shellInner, roughness: 0.75 }),
  batteryCover: () =>
    std("batteryCover", { color: COLORS.batteryCover, roughness: 0.62 }),
  dpad: () => std("dpad", { color: COLORS.dpad, roughness: 0.42 }),
  abButton: () => std("ab", { color: COLORS.abButton, roughness: 0.32 }),
  rubber: () => std("rubber", { color: COLORS.startSelect, roughness: 0.88 }),
  membrane: () =>
    std("membrane", {
      color: COLORS.membrane,
      roughness: 0.82,
      transparent: true,
      opacity: 0.93,
    }),
  carbon: () => std("carbon", { color: COLORS.carbon, roughness: 0.7 }),
  pcb: () =>
    std("pcb", { color: COLORS.pcb, roughness: 0.45, metalness: 0.05 }),
  pcbEdge: () => std("pcbEdge", { color: "#c9c19a", roughness: 0.8 }),
  copper: () =>
    std("copper", { color: COLORS.copper, roughness: 0.35, metalness: 1 }),
  gold: () => std("gold", { color: "#d7b153", roughness: 0.3, metalness: 1 }),
  solder: () =>
    std("solder", { color: COLORS.solder, roughness: 0.28, metalness: 1 }),
  ic: () => std("ic", { color: COLORS.ic, roughness: 0.6 }),
  steel: () =>
    std("steel", { color: COLORS.steel, roughness: 0.3, metalness: 1 }),
  darkSteel: () =>
    std("darkSteel", { color: "#55585e", roughness: 0.35, metalness: 1 }),
  nickel: () =>
    std("nickel", { color: COLORS.nickel, roughness: 0.22, metalness: 1 }),
  ceramic: () => std("ceramic", { color: "#c7a77a", roughness: 0.5 }),
  resistor: () => std("resistor", { color: "#1f1f1f", roughness: 0.5 }),
  capBlue: () => std("capBlue", { color: "#2a3f7a", roughness: 0.45 }),
  capBlack: () => std("capBlack", { color: "#1b1b1d", roughness: 0.45 }),
  capTop: () =>
    std("capTop", { color: "#c7c9cc", roughness: 0.3, metalness: 1 }),
  plasticBlack: () =>
    std("plasticBlack", { color: "#1c1c1e", roughness: 0.55 }),
  plasticWhite: () => std("plasticWhite", { color: "#ecebe5", roughness: 0.5 }),
  plasticBeige: () => std("plasticBeige", { color: "#d9cfb6", roughness: 0.6 }),
  speakerCone: () =>
    std("speakerCone", { color: COLORS.speakerCone, roughness: 0.85 }),
  ribbon: () =>
    std("ribbon", {
      color: COLORS.ribbon,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    }),
  wireRed: () => std("wireRed", { color: "#b3261e", roughness: 0.5 }),
  wireBlack: () => std("wireBlack", { color: "#1a1a1a", roughness: 0.5 }),
  wireBlue: () => std("wireBlue", { color: "#2c4fa3", roughness: 0.5 }),
  wireWhite: () => std("wireWhite", { color: "#e8e6e0", roughness: 0.5 }),
  cart: () => std("cart", { color: COLORS.cart, roughness: 0.6 }),
  battery: () =>
    std("battery", { color: COLORS.battery, roughness: 0.3, metalness: 0.3 }),
  handleRed: () => std("handleRed", { color: "#c2272d", roughness: 0.45 }),
  handleBlack: () => std("handleBlack", { color: "#202024", roughness: 0.6 }),
  spudger: () => std("spudger", { color: "#2b6fd8", roughness: 0.5 }),
  glass: () => {
    let m = cache.get("glass") as MeshPhysicalMaterial | undefined;
    if (!m) {
      m = new MeshPhysicalMaterial({
        color: "#ffffff",
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        depthWrite: false,
      });
      cache.set("glass", m);
    }
    return m;
  },
  lcdGlass: () =>
    std("lcdGlass", {
      color: COLORS.lcdGlass,
      roughness: 0.25,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
    }),
  polarizer: () =>
    std("polarizer", { color: "#8f9877", roughness: 0.35, metalness: 0.05 }),
  reflector: () =>
    std("reflector", { color: "#9c9f94", roughness: 0.25, metalness: 0.6 }),
};

/** The red power LED; DeviceLife turns its glow on. */
export const ledMaterial = () =>
  std("led", {
    color: "#5a1414",
    emissive: "#ff2a1a",
    emissiveIntensity: 0,
    roughness: 0.25,
  });
