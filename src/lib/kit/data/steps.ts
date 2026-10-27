import type { StepDef, Vec3 } from "../types";

const range = (prefix: string, n: number, from = 1) =>
  Array.from({ length: n }, (_, i) => `${prefix}-${i + from}`);

// Views. Front-half steps look from the near side of the bench, rear-half
// steps from the far side, so each half is seen the right way up.
const NEAR: Vec3 = [0, 1.15, 1];
const FAR: Vec3 = [0, 1.15, -1];
const front = (dist: number) => ({ group: "front" as const, dir: NEAR, dist });
const back = (dist: number) => ({ group: "back" as const, dir: FAR, dist });

export const STEPS: StepDef[] = [
  {
    id: "front-shell",
    title: "Lay the front housing face-down",
    pose: "open",
    focus: "front",
    view: front(430),
    slots: ["front-shell"],
    bullets: [
      {
        tone: "info",
        text: "Drag the front housing onto the near half of the bench. It goes in face-down with the screen window down and the cartridge edge pointing away from you.",
      },
      {
        tone: "info",
        text: "Seen like this everything is mirrored: the D-pad opening is lower-right and the speaker grille lower-left.",
      },
      {
        tone: "note",
        text: "Check the screw bosses for cracks before you start. Leave the housing flat from here on, or loose buttons will fall out.",
      },
    ],
  },
  {
    id: "buttons",
    title: "Drop in the D-pad and A/B buttons",
    pose: "open",
    focus: "front",
    view: front(360),
    slots: ["dpad", "btn-a", "btn-b"],
    bullets: [
      {
        tone: "info",
        text: "Drop the cross-shaped D-pad into the cross opening from inside. Cross face down, round flange resting on the inside wall, pivot nub pointing up at you.",
      },
      {
        tone: "info",
        text: "Drop the two A/B buttons into the round holes, flange down. Check that each one moves freely.",
      },
      {
        tone: "note",
        text: "A and B are the same part (Nintendo 18408), so either button fits either hole.",
      },
    ],
  },
  {
    id: "rubber",
    title: "Lay the conductive rubber contacts",
    pose: "open",
    focus: "front",
    view: front(360),
    tool: "spudger",
    slots: ["rubber-dpad", "rubber-ab", "rubber-ss"],
    bullets: [
      {
        tone: "info",
        text: "Lay the round control-pad contact over the back of the D-pad, with the four black carbon pads facing up.",
      },
      {
        tone: "info",
        text: "Fit the two-dome A/B contact over its locating pins, then press the one-piece Start/Select rubber into the two slanted slots so the pills poke out of the front.",
      },
      {
        tone: "caution",
        text: "Don't touch the carbon pads. Skin oil makes buttons unreliable. If they're dirty, wipe them with isopropyl alcohol.",
      },
      {
        tone: "note",
        text: "Start and Select have no hard cap. The rubber itself is the button.",
      },
    ],
  },
  {
    id: "gasket",
    title: "Stick down the screen gasket",
    pose: "open",
    focus: "front",
    view: front(360),
    slots: ["gasket"],
    bullets: [
      {
        tone: "info",
        text: "Peel one liner and stick the foam gasket around the inside of the LCD window, then peel the second liner.",
      },
      {
        tone: "info",
        text: "The LCD presses against this adhesive face in the next steps and seals out dust.",
      },
      {
        tone: "caution",
        text: "Nintendo specifies a new gasket for every reassembly (service bulletin #91353).",
      },
    ],
  },
  {
    id: "speaker",
    title: "Seat the speaker",
    pose: "open",
    focus: "front",
    view: front(360),
    slots: ["speaker"],
    bullets: [
      {
        tone: "info",
        text: "Press the speaker into the round pocket behind the grille slots, cone facing down toward the grille.",
      },
      {
        tone: "info",
        text: "Set the speaker's tab into the groove in the pocket wall so it can't turn.",
      },
      {
        tone: "caution",
        text: "Route the two yellow leads around the rim. They must not lie on the magnet, or they'll be pinched when the case closes.",
      },
    ],
  },
  {
    id: "lcd-board",
    title: "Lower the LCD board into place",
    pose: "open",
    focus: "front",
    view: front(400),
    slots: ["lcd-board"],
    bullets: [
      {
        tone: "info",
        text: "Hold the board LCD-side down with the ribbon end toward the cartridge edge. Fold the ribbon's free end up out of the way.",
      },
      {
        tone: "info",
        text: "Lower it straight down. The contrast wheel goes into the left-side slot, which is on your right here, and the board's notches clear the tall case-screw bosses.",
      },
      {
        tone: "caution",
        text: "Don't press on the LCD glass. Blow any dust off first; dust trapped behind the gasket stays there for good.",
      },
    ],
  },
  {
    id: "lcd-screws",
    title: "Screw down the LCD board",
    pose: "open",
    focus: "front",
    view: front(380),
    tool: "phillips",
    slots: range("lcd-screw", 10),
    bullets: [
      {
        tone: "info",
        text: "Drive ten gold M2 × 7 mm Phillips screws, one into each hole ringed in white. Do the four through the LCD-holder ears first, then the rest crosswise.",
      },
      {
        tone: "info",
        text: "Turn each screw anticlockwise until it drops into the existing thread, then tighten gently.",
      },
      {
        tone: "caution",
        text: "Leave the hole in the dashed box (crossed-out screw icon) empty. Nintendo warns that a screw there damages the LCD.",
      },
      {
        tone: "caution",
        text: "Torque ≤ 0.2 N·m. Stripped bosses make the buttons feel mushy.",
      },
    ],
  },
  {
    id: "back-shell",
    title: "Lay the rear housing interior-up",
    pose: "open",
    focus: "back",
    view: back(430),
    slots: ["back-shell"],
    bullets: [
      {
        tone: "info",
        text: "Drag the rear housing onto the far half of the bench, interior up, so its cartridge edge faces the front half's cartridge edge.",
      },
      {
        tone: "info",
        text: "The camera swings round so you look at it the right way up: cartridge bay at the top, battery box at the bottom.",
      },
    ],
  },
  {
    id: "guard-plate",
    title: "Fit the PCB guard plate",
    pose: "open",
    focus: "back",
    view: back(360),
    slots: ["guard-plate"],
    bullets: [
      {
        tone: "info",
        text: "Lay the mirror-finish steel guard plate over the inside of the cartridge bay.",
      },
      {
        tone: "info",
        text: "Its two top-corner U-clips slip over the tall case-screw bosses.",
      },
      {
        tone: "note",
        text: "The plate keeps a cartridge's label and shell off the back of the CPU board. iFixit's guides never mention it.",
      },
    ],
  },
  {
    id: "guard-screws",
    title: "Screw down the guard plate",
    pose: "open",
    focus: "back",
    view: back(360),
    tool: "phillips",
    slots: range("guard-screw", 4),
    bullets: [
      {
        tone: "info",
        text: "Fix the plate with four gold M2 × 7 mm screws through its left and right flanges.",
      },
      {
        tone: "caution",
        text: "Gentle torque. These thread straight into plastic.",
      },
    ],
  },
  {
    id: "power-actuator",
    title: "Insert the power-switch actuator",
    pose: "open",
    focus: "back",
    view: back(360),
    slots: ["power-actuator"],
    bullets: [
      {
        tone: "info",
        text: "Fit the actuator into its guide at the top-left of the housing, with the knob poking through the top-edge opening.",
      },
      { tone: "info", text: "Slide it to OFF." },
      {
        tone: "note",
        text: "When it's switched ON, the actuator's tab drops into a notch in the cartridge, so you can't pull a game out while it's running.",
      },
      {
        tone: "caution",
        text: "Only the CPU board holds it in, so keep the housing flat until the board is screwed down.",
      },
    ],
  },
  {
    id: "cpu-board",
    title: "Lower the CPU board in",
    pose: "open",
    focus: "back",
    view: back(380),
    tool: "spudger",
    slots: ["cpu-board", "dcdc-board"],
    bullets: [
      {
        tone: "info",
        text: "Hold the CPU board copper side up, with the 21-pin ribbon connector toward the top. The 32-pin cartridge connector faces down into the bay.",
      },
      {
        tone: "info",
        text: "As it goes down, the battery terminals drop into the top of the battery box, the switch engages the actuator (both OFF), the volume wheel enters the right-side slot, and the link and DC ports line up with their openings.",
      },
      {
        tone: "info",
        text: "Stand the DC/DC converter board upright along the left wall beside the battery box. Its harness is pre-wired to the CPU board.",
      },
      {
        tone: "caution",
        text: "Don't force it. If the board won't sit flat, a terminal, the switch fork or the wheel is out of line.",
      },
    ],
  },
  {
    id: "cpu-screws",
    title: "Screw down the CPU board",
    pose: "open",
    focus: "back",
    view: back(400),
    tool: "phillips",
    slots: range("cpu-screw", 2),
    bullets: [
      {
        tone: "info",
        text: "Drive two gold M2 × 7 mm screws into the board's lower corners, either side of the cartridge-connector pins.",
      },
      {
        tone: "note",
        text: "The top corners have no screws yet. The two upper case screws pass through those holes and clamp the board when the case is closed.",
      },
    ],
  },
  {
    id: "jack-board",
    title: "Seat the headphone-jack board",
    pose: "open",
    focus: "back",
    view: back(360),
    tool: "spudger",
    slots: ["jack-board"],
    bullets: [
      {
        tone: "info",
        text: "Lay the small audio board along the bottom edge so the 3.5 mm jack lines up with the PHONES opening.",
      },
      {
        tone: "caution",
        text: "Pass its 4-wire harness between the post and the wall, then round the rib. A wire left on top of a boss gets crushed when the case closes.",
      },
    ],
  },
  {
    id: "jack-screws",
    title: "Screw down the jack board",
    pose: "open",
    focus: "back",
    view: back(360),
    tool: "phillips",
    slots: range("jack-screw", 2),
    bullets: [
      {
        tone: "info",
        text: "Drive two gold M2 × 7 mm screws, one either side of the jack.",
      },
    ],
  },
  {
    id: "ribbon",
    title: "Connect the 21-pin ribbon",
    pose: "open",
    focus: "both",
    view: { group: "both", dir: [1, 0.85, 0.35], dist: 560 },
    tool: "spudger",
    slots: [],
    action: { kind: "ribbon", label: "Push the ribbon in" },
    bullets: [
      {
        tone: "info",
        text: "The ribbon is soldered to the top of the LCD board. Its free end has a blue stiffener and plugs into the friction-fit connector at the top centre of the CPU board.",
      },
      {
        tone: "info",
        text: "Keep the contacts facing away from the CPU board. Hold the stiffened end with both thumbs and push it squarely into the connector until it's fully home.",
      },
      {
        tone: "caution",
        text: "Push on the stiffener, never on the ribbon itself. A skewed or half-seated ribbon is the classic cause of vertical lines on a DMG.",
      },
    ],
  },
  {
    id: "close",
    title: "Close the case",
    pose: "closed",
    focus: "both",
    view: { group: "both", dir: [1, 0.9, 0.55], dist: 600 },
    slots: [],
    action: { kind: "close", label: "Fold the halves together" },
    bullets: [
      {
        tone: "info",
        text: "Swing the front half over the top edge onto the rear half. The ribbon folds into a J under the top of the CPU board.",
      },
      {
        tone: "info",
        text: "Line up the contrast wheel (left), volume wheel (right), link port, DC jack, headphone jack and power knob with their openings, then squeeze the seam shut all the way round.",
      },
      {
        tone: "caution",
        text: "If the seam won't close, open it again. Look for a pinched ribbon or wire, an unseated rubber contact, or a wheel out of its slot.",
      },
    ],
  },
  {
    id: "flip",
    title: "Turn it over",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.2, 1], dist: 440 },
    slots: [],
    action: { kind: "flip", label: "Turn it face-down" },
    bullets: [
      {
        tone: "info",
        text: "Hold the seam closed and turn the Game Boy face-down, with the cartridge slot pointing away from you.",
      },
    ],
  },
  {
    id: "case-screws",
    title: "Drive the four outer case screws",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.25, 0.8], dist: 390 },
    tool: "triwing",
    slots: range("case-screw", 4),
    bullets: [
      {
        tone: "info",
        text: "Drop the four silver M2 × 8.2 mm tri-wing screws into the deep holes: two beside the cartridge slot and two at the lower corners of the label area.",
      },
      {
        tone: "info",
        text: "Turn each anticlockwise until it clicks into the thread, then tighten them crosswise. The top pair also clamps the CPU board's top corners.",
      },
      {
        tone: "caution",
        text: "Use a Y1 tri-wing bit. A flat or Phillips driver strips these heads, and over-tightening cracks the bosses.",
      },
    ],
  },
  {
    id: "bay-screws",
    title: "Drive the two battery-bay screws",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.25, 0.8], dist: 380 },
    tool: "triwing",
    slots: range("case-screw", 2, 5),
    bullets: [
      {
        tone: "info",
        text: "Fit the last two tri-wing screws in the floor of the battery bay, beside the outer cell channels.",
      },
      {
        tone: "note",
        text: "They aren't symmetric. One sits about 11 mm higher than the other, so match each screw to its ghost.",
      },
    ],
  },
  {
    id: "contacts",
    title: "Clip in the battery contacts",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.25, 0.8], dist: 380 },
    slots: ["contact-w1", "contact-w2a", "contact-w2b"],
    bullets: [
      {
        tone: "info",
        text: "Slide the two W2 bridge contacts into the slots in the bottom wall of the bay until their clips catch. They join cells 1+2 and 3+4.",
      },
      {
        tone: "info",
        text: "Slide the W1 bridge into the centre slots in the top wall. It joins cells 2+3.",
      },
      {
        tone: "note",
        text: "The outer top spring (−) and plate (+) are soldered to the CPU board and already poke into the bay.",
      },
    ],
  },
  {
    id: "batteries",
    title: "Insert four AA cells",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.25, 0.8], dist: 380 },
    slots: range("battery", 4),
    bullets: [
      {
        tone: "info",
        text: "The cells lie lengthwise and alternate direction. Each flat (−) end goes against a spring.",
      },
      {
        tone: "info",
        text: "Follow the polarity marks moulded into the bay floor.",
      },
      {
        tone: "note",
        text: "Four AA cells give about 6 V and around 30 hours of play.",
      },
    ],
  },
  {
    id: "cover",
    title: "Clip on the battery cover",
    pose: "back-up",
    focus: "both",
    view: { group: "back", dir: [0, 1.25, 0.8], dist: 380 },
    slots: ["battery-cover"],
    bullets: [
      {
        tone: "info",
        text: "Hook the cover's two tabs into the slots at the bottom of the bay, then swing it shut until the latch at the top clicks.",
      },
      {
        tone: "caution",
        text: "On old units the latch is a brittle spring clip. Don't force it.",
      },
    ],
  },
  {
    id: "flip-up",
    title: "Turn it back over",
    pose: "front-up",
    focus: "both",
    view: { group: "front", dir: [0, 1.25, 0.85], dist: 450 },
    slots: [],
    action: { kind: "flip", label: "Turn it face-up" },
    bullets: [
      {
        tone: "info",
        text: "Turn the Game Boy back over so the screen window faces up.",
      },
    ],
  },
  {
    id: "lens",
    title: "Apply the screen lens",
    pose: "front-up",
    focus: "both",
    view: { group: "front", dir: [0, 1.3, 0.8], dist: 380 },
    slots: ["lens"],
    bullets: [
      {
        tone: "info",
        text: "Blow any dust off the LCD through the window, then peel the backing off the adhesive lens.",
      },
      {
        tone: "info",
        text: "Line it up in the recessed bezel, with DOT MATRIX WITH STEREO SOUND along the top and the BATTERY lamp on the left. Press from the centre outward.",
      },
      {
        tone: "caution",
        text: "Once the adhesive touches, it's very hard to reposition. Line it up before it makes contact.",
      },
    ],
  },
  {
    id: "cartridge",
    title: "Stand it up and insert a Game Pak",
    pose: "upright",
    focus: "both",
    // Pulled back so the cartridge waiting above the slot stays in view.
    view: { group: "back", dir: [-0.65, 0.9, -1], dist: 470 },
    slots: ["cartridge"],
    bullets: [
      {
        tone: "info",
        text: "With the power switch OFF, slide the cartridge into the slot from the top, label facing the back, until it seats in the 32-pin connector.",
      },
      {
        tone: "caution",
        text: "Never insert or remove a cartridge with the power on.",
      },
    ],
  },
  {
    id: "power",
    title: "Switch it on",
    pose: "upright",
    focus: "both",
    view: { group: "front", dir: [0.35, 0.3, 1], dist: 430 },
    slots: [],
    action: { kind: "power", label: "Slide power to ON" },
    bullets: [
      {
        tone: "info",
        text: "Slide the power switch to ON. The actuator's tab locks the cartridge in, the red BATTERY lamp lights, and the logo scrolls down.",
      },
      {
        tone: "info",
        text: "Then test it: contrast and volume wheels, every button, the speaker, and the headphone jack (plugging in mutes the speaker).",
      },
    ],
  },
];
