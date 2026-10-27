# DMG-01 Build Kit

Assemble an original Nintendo Game Boy (DMG-01) in the browser, part by part.

- **Parts (left):** every piece in the kit (50 parts in 22 kinds, down to each screw) and the three tools. You find what the step calls for (search helps), pick up tools, and drag parts out.
- **Bench (middle):** the 3D build. A part's outline only appears once you're holding the right part; drop it there to fit it. The two halves open like a book and close about the top edge.
- **Instructions (right):** a 27-step guide based on Nintendo's *Game Boy Technical Manual* (Rev. 11/93). It says what to fit, but never fetches the part for you. "Can't find it?" flashes the right row in the parts list.
- **Moving around:** drag (or two-finger scroll) to turn, right-drag / Shift-drag to pan, scroll or pinch to zoom, double-click a part to centre on it. The cube in the corner jumps to any side, including underneath.
- **Sound:** interaction sounds rendered with [earshot](https://github.com/Leonxlnx/earshot) live in `public/sfx/` (mute in the corner controls).

```bash
bun install
bun dev        # http://localhost:3000
```

`/inspect?p=<part-id>` renders a single part on its own, for example `/inspect?p=cpu-board&dir=0,0.15,-1`.

Dev mode (`/?dev`, or press <kbd>`</kbd>) adds a step picker to the top of the instructions: jump to any step with everything before it already built, or to the finished console. <kbd>[</kbd> and <kbd>]</kbd> step back and forward; `/?dev=0` or the × turns it off.

## How the parts are made

Every part is generated procedurally with three.js and three-bvh-csg. No mesh files are imported. Dimensions are in millimetres in one device frame: origin at the centre of the closed unit, +Z out of the screen. They come from:

- A caliper-measured CAD of an original DMG shell. It sets the Z frame (front face +16.125, parting line +3.125), the button openings and dishes, the speaker bevel and the internal bosses.
- Gekkio's 600 dpi DMG-CPU-06 scans and schematics, and open drop-in replacement boards, for board outlines, holes and the placement of all 52 CPU-board components.
- Photogrammetry of museum and studio photos and iFixit step images for the rear housing, battery bay, cover and cartridge.
- Nintendo's service manual for the parts list, screw counts and sizes (6 × M2 × 8.2 tri-wing, 18 × M2 × 7 Phillips) and the reassembly order.

Where sources disagreed, the measured CAD and the shell openings won. The resolved values live next to each builder in `src/lib/kit/parts/`.

## Layout

```
src/lib/kit/parts/     part builders (shells, boards, controls, screws, tools…)
src/lib/kit/data/      parts catalogue, slots (where each part goes), steps, poses
src/lib/kit/store.ts   build state (zustand)
src/components/builder tray, guide, overlay, and the R3F scene (drag, snap, install, ribbon, wires, boot screen)
```
