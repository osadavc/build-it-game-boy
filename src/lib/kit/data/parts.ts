import {
  buildBatteryCover,
  buildCartridge,
  buildDcDcBoard,
  buildGasket,
  buildGuardPlate,
  buildJackBoard,
  buildLens,
} from "../parts/accessories";
import { buildBackShell } from "../parts/back-shell";
import {
  buildABButton,
  buildABMembrane,
  buildDpad,
  buildDpadMembrane,
  buildStartSelect,
} from "../parts/controls";
import { buildCpuBoard } from "../parts/cpu-board";
import { buildPhillipsScrew, buildTriwingScrew } from "../parts/fasteners";
import { buildFrontShell } from "../parts/front-shell";
import { buildLcdBoard } from "../parts/lcd-board";
import {
  buildBattery,
  buildBridgeContact,
  buildPowerSlider,
} from "../parts/power";
import { buildSpeaker } from "../parts/speaker";
import type { PartDef } from "../types";

const PI = Math.PI;

export const PARTS: PartDef[] = [
  /* ------------------------------ Housing ------------------------------ */
  {
    id: "front-shell",
    name: "Front housing",
    category: "Housing",
    qty: 1,
    marking: "Nintendo 18405",
    spec: "ABS · 90 × 148 × 13.0 mm",
    facts: [
      ["Envelope", "90.0 × 148.0 mm, 13.0 deep"],
      ["Plate / walls", "2.4 mm, 4.4° draft"],
      ["Corners", "R3 · R18 bottom-right"],
      ["Lens recess", "75.2 × 57.0 × 1.0 mm"],
      ["D-pad opening", "22.0 span, 8.0 arms"],
      ["A / B holes", "Ø10.75, 16.0 apart at 25°"],
      ["Grille", "6 grooves on a 19.6° bevel"],
    ],
    description:
      "The face of the Game Boy: lens recess, D-pad and A/B dishes, Start/Select countersinks and the speaker grille on its bevel. Inside: ten LCD-board posts, six tri-wing receivers, guide rings and rubber locating pins.",
    build: buildFrontShell,
    rest: [PI / 2, 0, PI],
    thumbView: [0.4, 0.5, 1],
  },
  {
    id: "back-shell",
    name: "Rear housing",
    category: "Housing",
    qty: 1,
    marking: "Nintendo 18406",
    spec: "ABS · 90 × 148 × 19.25 mm",
    facts: [
      ["Envelope", "90.0 × 148.0 mm, 19.25 deep"],
      ["Back edges", "R8 sides · R6.5 bottom"],
      ["Rails / lugs", "1.5 mm proud of the plate"],
      ["Cartridge bay", "58.8 wide, floor at the guard plate"],
      ["Battery bay", "58.0 × 55.5, 4 × AA"],
      ["Grip grooves", "26 wrapping + 6 inner"],
      ["Rating text", "Moulded, not a sticker"],
    ],
    description:
      "Carries the cartridge bay, the battery box and the openings for the power switch, link port, volume wheel and DC jack. The rating text is moulded in; the only sticker is the serial number.",
    build: buildBackShell,
    thumbView: [0.4, 0.5, -1],
  },
  {
    id: "lens",
    name: "Screen lens",
    category: "Display",
    qty: 1,
    marking: "Nintendo 18418",
    spec: "Acrylic · 74.3 × 56.3 × 0.9 mm",
    facts: [
      ["Window", "47.7 × 43.5 mm"],
      ["Corners", "R2.6 · R11.6 bottom-right"],
      ["Print", "Back-printed, #57545D mask"],
      ["Stripes", "Magenta y 58.51 · navy y 57.03"],
    ],
    description:
      "Printed acrylic cover over the LCD, with the BATTERY lamp window. Fitted from the front with adhesive.",
    build: buildLens,
    thumbView: [0.2, 0.3, 1],
  },
  {
    id: "gasket",
    name: "Screen gasket",
    category: "Display",
    qty: 1,
    marking: "Nintendo 21105",
    spec: "Foam · 57.6 × 51.6 × 0.72 mm",
    facts: [["Use", "Seals the LCD to the window"]],
    description:
      "Double-sided adhesive foam frame that seals the LCD to the inside of the screen window. Nintendo specifies a new one at every reassembly.",
    build: buildGasket,
  },
  /* ------------------------------- Boards ------------------------------ */
  {
    id: "lcd-board",
    name: "LCD board",
    category: "Boards",
    qty: 1,
    marking: "DMG-LCD-06",
    spec: "81.05 × 117.45 × 1.0 mm + LCD",
    facts: [
      ["Panel", "Sharp reflective STN"],
      ["Resolution", "160 × 144, 4 shades"],
      ["Dot pitch", "0.289 mm"],
      ["Active area", "46.24 × 41.62 mm"],
      ["Drivers", "LH5076F row · LH5077F column (TAB)"],
      ["Contrast", "30 kΩ pot, Ø16 wheel"],
      ["Screws", "10 × M2 × 7 Phillips"],
    ],
    description:
      "Front board, factory-built with the LCD module in its cream holder. Carbon pads under every button, the red power LED, the contrast wheel and the speaker pads. The 21-wire ribbon is soldered to its top edge.",
    build: buildLcdBoard,
    thumbView: [0.35, 0.5, 1],
  },
  {
    id: "cpu-board",
    name: "CPU board",
    category: "Boards",
    qty: 1,
    marking: "DMG-CPU-06",
    spec: "80.1 × 79.15 × 1.2 mm",
    facts: [
      ["CPU", "DMG-CPU B (LR35902) QFP-80"],
      ["Clock", "4.194304 MHz crystal"],
      ["RAM", "2 × 8 KB SRAM (work + video)"],
      ["Audio amp", "IR3R40 SSOP-18"],
      ["Cartridge", "32-pin, 1.5 mm pitch"],
      ["Ribbon socket", "21-way, 1.25 mm"],
    ],
    description:
      "Main board. Every component faces the back of the case: the CPU, both SRAMs, the cartridge connector, link port, DC jack, power switch and volume wheel. A copper shield and the ribbon socket face the LCD board.",
    build: buildCpuBoard,
    thumbView: [0.3, 0.45, -1],
  },
  {
    id: "dcdc-board",
    name: "DC/DC converter",
    category: "Boards",
    qty: 1,
    marking: "Nintendo 18486",
    spec: "51 × 14 mm · stands upright",
    facts: [
      ["Output", "+5 V logic, LCD bias"],
      ["Harness", "4C-49L: red + 3 green"],
    ],
    description:
      "Small converter board that makes the logic and LCD bias voltages from the 6 V battery pack.",
    build: buildDcDcBoard,
    thumbView: [0.3, 0.4, 1],
  },
  {
    id: "jack-board",
    name: "Headphone-jack board",
    category: "Boards",
    qty: 1,
    marking: "Nintendo 18395",
    spec: "39 × 15 mm · 3.5 mm jack",
    facts: [
      ["Harness", "4C-64L: white + 3 black"],
      ["Screws", "2 × M2 × 7 Phillips"],
    ],
    description:
      "Small board along the bottom edge carrying the PHONES jack. Plugging in mutes the speaker.",
    build: buildJackBoard,
    thumbView: [0.3, -0.5, 1],
  },
  {
    id: "guard-plate",
    name: "PCB guard plate",
    category: "Housing",
    qty: 1,
    marking: "Nintendo 18417",
    spec: "Mirror steel · 0.3 mm",
    facts: [
      ["Extent", "68.5 × 54 mm"],
      ["Screws", "4 × M2 × 7 Phillips"],
    ],
    description:
      "Mirror-finish steel sheet between the cartridge bay and the CPU board. It keeps a cartridge from rubbing the board's solder side.",
    build: buildGuardPlate,
    thumbView: [0.2, 0.3, 1],
  },
  /* ------------------------------ Controls ----------------------------- */
  {
    id: "dpad",
    name: "D-pad",
    category: "Controls",
    qty: 1,
    marking: "Nintendo 18407",
    spec: "ABS · 20.55 span · 8.7 tall",
    facts: [
      ["Arm width", "6.75 mm"],
      ["Flange", "Ø25.6 mm"],
      ["Pivot nub", "R2.8 hemisphere"],
      ["Dish", "R167 concave, Ø5.6 dimple"],
    ],
    description:
      "The cross key. It rocks on a hemispherical pivot nub so each arm presses one dome of the rubber contact. Twelve grip grooves, three per arm.",
    build: buildDpad,
    thumbView: [0.35, -0.6, 1],
  },
  {
    id: "ab-button",
    name: "A / B button",
    category: "Controls",
    qty: 2,
    marking: "Nintendo 18408",
    spec: "ABS · Ø10.4 × 6.95 mm",
    facts: [
      ["Top", "Convex R20"],
      ["Tabs", "2 × 1.95 mm, r 7.8"],
      ["Travel", "≈ 2.1 mm"],
    ],
    description:
      "Glossy magenta button. A and B are the same moulding; two side tabs stop it falling out of the front.",
    build: buildABButton,
    thumbView: [0.4, -0.7, 1],
  },
  {
    id: "rubber-dpad",
    name: "D-pad rubber contact",
    category: "Controls",
    qty: 1,
    marking: "Nintendo 18410",
    spec: "Silicone · 30.6 mm · 4 domes",
    facts: [
      ["Domes", "4 on r 8.75 mm"],
      ["Carbon pills", "Ø4.6 mm"],
    ],
    description:
      "Mint silicone pad with four collapsing domes. Each carbon pill shorts a comb pad on the LCD board when you press an arm.",
    build: buildDpadMembrane,
    thumbView: [0.3, -0.5, 1],
  },
  {
    id: "rubber-ab",
    name: "A/B rubber contact",
    category: "Controls",
    qty: 1,
    marking: "Nintendo 18411",
    spec: "Silicone · 31.4 × 14.8 mm",
    facts: [["Domes", "2, 15.99 mm apart"]],
    description:
      "Cream two-dome pad under the A and B buttons, located by two pins through its lobes.",
    build: buildABMembrane,
    thumbView: [0.3, -0.5, 1],
  },
  {
    id: "start-select",
    name: "Start/Select rubber",
    category: "Controls",
    qty: 1,
    marking: "Nintendo 18412",
    spec: "Silicone · 2 pills at 25.5°",
    facts: [
      ["Pills", "10.3 × 2.7 mm"],
      ["Pitch", "14.65 mm"],
    ],
    description:
      "One grey rubber piece. The two slanted pills are the Start and Select buttons themselves, with no hard caps.",
    build: buildStartSelect,
    thumbView: [0.3, -0.6, 1],
  },
  /* -------------------------------- Audio ------------------------------ */
  {
    id: "speaker",
    name: "Speaker",
    category: "Audio",
    qty: 1,
    marking: "Nintendo 18441",
    spec: "8 Ω · Ø28.9 × 5.0 mm",
    facts: [
      ["Cone", "Clear mylar"],
      ["Magnet cup", "Ø19.8 mm"],
      ["Leads", "2 × yellow, to SP1/SP2"],
    ],
    description:
      "Mylar-cone speaker that sits in a ring behind the grille. Its leads are soldered to the LCD board.",
    build: buildSpeaker,
    thumbView: [0.4, -0.5, 1],
  },
  /* -------------------------------- Power ------------------------------ */
  {
    id: "power-actuator",
    name: "Power-switch actuator",
    category: "Power",
    qty: 1,
    marking: "Nintendo 18409",
    spec: "ABS · 5.35 mm travel",
    facts: [
      ["Knob", "5 × 5 mm, domed"],
      ["Lock tongue", "7.65 × 5.9 mm"],
    ],
    description:
      "Slides the power switch and, when ON, drops a tongue into the cartridge's notch so the game can't be pulled out while running.",
    build: buildPowerSlider,
    rest: [0, 0, 0],
    thumbView: [0.6, 0.8, 0.7],
  },
  {
    id: "bridge-contact",
    name: "Battery bridge contact",
    category: "Power",
    qty: 3,
    marking: "Nintendo 18413 / 18414",
    spec: "Ni-plated steel · 28 × 11 mm",
    facts: [
      ["Spring", "Ø6.0, 6 turns"],
      ["Pitch", "14.5 mm spring-to-dimple"],
    ],
    description:
      "Joins two neighbouring cells in series: a spring for one cell's (−) end and a dimple for the next cell's (+) end.",
    build: buildBridgeContact,
    rest: [0, 0, 0],
    thumbView: [0.3, 1, 0.6],
  },
  {
    id: "aa-battery",
    name: "AA cell",
    category: "Power",
    qty: 4,
    spec: "LR6 · Ø14.5 × 50.5 mm",
    facts: [["Voltage", "1.5 V × 4 = 6 V"]],
    description: "Alkaline AA cell. Four in series give the DMG its 6 V.",
    build: buildBattery,
    rest: [0, 0, PI / 2],
    thumbView: [0.6, 0.3, 1],
  },
  {
    id: "battery-cover",
    name: "Battery cover",
    category: "Housing",
    qty: 1,
    marking: "Nintendo 18098",
    spec: "ABS · 61.6 × 57.8 mm",
    facts: [
      ["Grooves", "10 × 1.1 mm at 4.0 pitch"],
      ["Latch", "Cantilever hook at top"],
      ["Hinge", "2 tabs on the bottom edge"],
    ],
    description:
      "Ribbed door over the battery bay: two hooks at the bottom and a spring latch at the top.",
    build: buildBatteryCover,
    rest: [Math.PI / 2, 0, 0],
    thumbView: [0.3, 0.4, -1],
  },
  /* ------------------------------ Fasteners ---------------------------- */
  {
    id: "screw-triwing",
    name: "Tri-wing screw",
    category: "Fasteners",
    qty: 6,
    marking: "Nintendo 21826",
    spec: "M2 × 8.2 · Y-type · silver",
    facts: [
      ["Head", "Ø3.8 × 1.4 pan"],
      ["Thread", "Self-tapping, for ABS"],
      ["Driver", "Tri-wing Y1"],
    ],
    description:
      "Nintendo's security screw. Four close the case from the back and two sit in the battery bay.",
    build: buildTriwingScrew,
    rest: [0, 0, 0],
    thumbView: [0.5, 0.5, 0.9],
  },
  {
    id: "screw-phillips",
    name: "Phillips screw",
    category: "Fasteners",
    qty: 18,
    marking: "Nintendo 18420",
    spec: "M2 × 7 · PH0 · gold",
    facts: [
      ["Head", "Ø3.5 × 1.3 pan"],
      ["Finish", "Yellow zinc"],
      ["Torque", "≤ 0.2 N·m"],
    ],
    description:
      "Internal screw: 10 hold the LCD board, 4 the guard plate, 2 the CPU board and 2 the jack board.",
    build: buildPhillipsScrew,
    rest: [0, 0, 0],
    thumbView: [0.5, 0.5, 0.9],
  },
  /* -------------------------------- Extras ----------------------------- */
  {
    id: "cartridge",
    name: "Game Pak",
    category: "Extras",
    qty: 1,
    spec: "57.0 × 65.5 × 7.6 mm",
    facts: [
      ["Connector", "32 pads, 1.5 mm pitch"],
      ["Lock notch", "5.2 × 2.9 mm, top corner"],
    ],
    description:
      "A test cartridge to check your build: a DMG Game Pak shell with an original label. When the power is ON, the switch's tongue drops into its notch and locks it in.",
    build: buildCartridge,
    thumbView: [0.3, 0.4, 1],
  },
];
