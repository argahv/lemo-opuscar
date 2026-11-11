# Inkshift — Style Prompt

> A cinematic graphic novel in motion: a dimensional 3D world printed with two inks per surface (flat fills, object-anchored halftone, ink keylines), characters drawn as 2D rigs posed on twos, and one rule above all: when the story's reality changes, the print itself changes with it.
> References (grammar only): screen-printed travel and city posters (flat cut-paper planes, a limited ink set, one-point perspective); mixed-frame-rate stylised animated features (characters on twos against a smooth camera); mid-century comic printing (halftone tones, keylines, misregistered plates). Never copy their characters, costumes, layouts, logos or lettering, and never name them in the film.

## 1. Essence, and what it is not

A frame reads as Inkshift when:

- **Every surface is printed, not shaded.** Each object carries a light ink and a dark ink; tones between them are a halftone screen (or, in an altered reality, line hatching), never a gradient.
- **Ink keylines belong to the geometry.** Heavy silhouettes near the camera, thin creases, lines thinning with distance.
- **The world has real depth and a real camera**, and the illustration stays glued to it: screens and lines are anchored to objects, so nothing slides when the camera moves.
- **Characters are drawn shapes on twos** in a world whose camera moves on ones.
- **The impossible changes the print.** When the story's physics change, the palette, the screen (dots → hatching), the light direction and the plates' registration change with them, bounded by a visible tear in the world.

It is not a comic-book filter over 3D (no full-screen dots, no constant red/cyan ghosting), not a Risograph or Halftone Dossier (those are flat print on paper, no 3D camera), not low-poly or brick-toy 3D (no plastic shading, no PBR), and not a copy of any film's characters or signature compositions.

## 2. Materials & rendering

- **Two inks per surface.** Each object family has a light ink and a dark ink. Light comes in three bands per face (lit, mid, shadow); the tone becomes ink coverage, printed through a screen. Walls add a graphic gradient (darker toward the street in the original reality, toward the sky in an altered one); roofs and props stay clean.
- **Screens anchored to objects.** Halftone (a 45° euclidean spot) and hatching are computed from object or world coordinates, never from screen pixels. Their cell size is chosen per pixel from two blended octaves so dots stay 8–18 px on screen at every distance.
- **Keylines from geometry.** An info pass (view normal, 1/depth, object id) feeds a line pass: silhouettes where a neighbour is clearly farther (drawn on the front surface only, heavier near the camera), creases where normals turn, object boundaries where ids differ. Lines fade with distance. Render at 2× and box-filter down.
- **Windows and façades are graphic**: punched grids, vertical slits or ribbon bands per building, fading out before they become noise.
- **Paper.** A faint static fibre grain multiplies the whole print; it is the page, not the world.
- **Characters** are vector rigs drawn at full output resolution and composited at their depth (occluded by what stands in front of them). Their shadow side is a figure-anchored dot screen; light from another reality arrives as a thin rim of that reality's ink.
- **No motion blur on poses; a film shutter on the camera.** Sub-frames (360° by default) sample the camera and fast world motion so anchored screens don't twinkle; poses and story events are drawn at the frame time and stay crisp.
- Everything is code: three.js scenes with custom shaders, Canvas 2D for characters and graphics. No generated images or video in a frame.

## 3. Colour logic

- **Five foundation inks**: a midnight ink (keylines, deep shadow, night), a warm paper (light surfaces, negative space), a reality teal (the familiar world, technology), a discovery amber (revelation, the important object, the tear's light), a fracture coral (danger, contradiction, instability). Settings may add inks that relate to these.
- **A shot has one dominant ink, one supporting ink and one accent.** Never let all five compete.
- **Colour states follow the story.** Before the impossible: midnight shadows, teal accents, paper highlights. During the revelation: amber appears, coral fractures develop. After the change: a new relationship establishes the altered reality (for example amber-dominant with coral and paper).
- **Amber is reserved** for discovery and the tear's light until the story spends it.
- Values: keylines are always the darkest thing in a shot; the sky is never darker than the keylines.
- Example palette (the demo's): #101827 · #F3EBDD · #26C6B8 · #F4B544 · #F16A59.

## 4. Type & subtitles

- Editorial, cinematic, sans-serif (OFL; for example Inter Tight or Archivo for captions, a condensed grotesque for titles). No comic-book logo lettering, no imitation of known title designs.
- Caption boxes are warm-paper plates with a midnight keyline, in the frame's safe area (vertical: clear of the bottom 18% and the right-hand interface rail).
- Sound-effect lettering is rare and physical: it sits in the world (behind a moving object, casting a shadow), never as decoration.
- Subtitles hold ≥ max(1.8 s, speech + 0.6 s), large and short; check them at phone size.

## 5. Motion quality

- Output 24 fps. **Characters on twos (12 fps)**; camera and light on ones. Story events that are drawn (a crack growing, a panel boundary) step on twos; physical motion in the world (things falling, rising) runs on ones under the shutter.
- Performance is authored: notice → pause → eyes → head → shoulders → reaction. Anticipation before a reach, follow-through after; no linear arm interpolation.
- Easing: ease-out for tears and splits (fast then settling), monotone keyframes for the camera, springs only for small comic pops.
- **What never moves**: the screens and keylines relative to their objects, and the paper grain relative to the frame.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| slow push-in on a figure | attention gathering | a discovery; a decision forming |
| tilt that follows a gaze | the audience looks where the character looks | an anomaly in the sky; scale |
| locked hold | the world is about to change | the beat before an impossible event |
| controlled jolt (two decaying oscillations) | physical impact of a reality change | a split; an arrival |
| hard cut to a wide | consequence and scale | the reveal of a changed world |
| slow pull-back on a hold | a held tableau | an ending image |

Framing: at key moments the character fills ≥ 1/3 of the frame height; the tear and the character's gaze share one diagonal. Transitions are made from the medium (a tear, a panel break, an impact frame), not fades. A still frame beats an unnecessary orbit.

## 7. Sound palette

- **Voice**: expressive, close, natural; never cartoon.
- **Reality Fracture**: a short paper-tear texture, a deep tonal movement, one sharp but controlled impact, and a change in the air afterwards (the same ambience, duller and closer).
- **Possibility Echo**: a reversed transient, a slightly detuned echo, tonal fragments placed left and right.
- **Panel Break**: a tactile paper slide, a precise click, a directional accent.
- **Revelation**: environmental noise drops, a harmonic shift, controlled silence before or after.
- Ambience from the setting (city wind, rooms); foley matches materials (paper, cloth, stone). At least one real silence before the turn. No cartoon sound library, no generic piano-and-strings. Mix to −14 LUFS; duck beds under the key events.

## 8. Native moves

- **Reality Fracture.** A tear lives on a sheet in world space; rays that meet the sheet inside the tear before any original surface see the other reality, rendered as its own scene with its own inks, screen (hatching), light direction and physics. The tear's edge is ink, torn paper and the other reality's light printed as dots. Its scale follows the story: a hairline for a discovery, the whole composition for a catastrophe. *Fits content like:* a door that opens onto another century; an ocean that turns to glass from one shore; a mirror showing a future self; a map whose borders peel away.
- **Possibility Echo.** A limb, an object or a figure shows other possible states at once (the choice almost made, the consequence about to happen) as offset, coloured, thin-lined copies on a different cadence. *Fits content like:* a hand hovering over two buttons; a car at a fork in the road; a key that could open three locks.
- **Panel Break.** Action starts inside a comic panel; a body part crosses the boundary and the panel expands into the full 3D world with the camera following. *Fits content like:* a diary entry becoming the room it describes; a news photo becoming the street; a frozen moment resuming.
- **Impact Frame.** One or two frames where the print inverts (paper ↔ ink). Only on the story's biggest event. *Fits content like:* the moment of contact; the instant a rule breaks; a shot fired off-screen.
- **Plate Slip.** The colour plates misregister against the keylines in a bounded region, never over faces or text. *Fits content like:* a memory; an unstable signal; time folding.

## 9. Pitfalls of the medium

- **Screen-space dots** slide over moving objects: anchor every screen to objects or the world, choose the cell from screen derivatives.
- **Twinkle in motion**: anchored fine dots moving about half a cell per frame pop on and off. Use the shutter, larger cells and gentler fast moves; test with a locked camera (nothing static may change between frames).
- **Grazing sheets**: a tear on a plane seen nearly edge-on flattens and aliases; stand the sheet to face the camera and fade the tear where it grazes.
- **Every face dotted** reads as texture noise: let lit faces and roofs stay clean.
- **Outline soup**: thick uniform lines everywhere. Weight by distance and type; let backgrounds lose lines.
- **Constant chaos**: keep calm frames, negative space and silence around the impossible event.
- **A billboard character seen from the wrong side**: keep the camera on the side the drawing implies (a profile wants a camera perpendicular to the facing).
- **Moiré** between window grids and dots: fade windows out before their cells reach about 10 px.

## 10. Engine

- `demo/src/world.js`: `genCity(seed)` (layout, two realities, fall parameters), `makeInkMaterial(G, alt)` (two-ink surfaces, windows, discard behind the sheet), `PRINT_GLSL` (`halftone`, `hatch`, the octave LOD), `makeSky`, `makeContactShadow`.
- `demo/src/print.js`: `makePrint(renderer, W, H, SS)`: colour and info passes for both realities, the composite (sheet ray test, keylines, plate slip, tear drawing, character layer, impact frame, paper), shutter accumulation and the 2× box downsample.
- `demo/src/fracture.js`: the sheet (`SHEET`, `side`, `sheetU`), the crack (`crackU`, `CRACK_GLSL`) and its timing `fractureState(t)`.
- `demo/src/observer.js`: the code-drawn rig (`part`, `dots`, `arm`, `hand`, `head`), poses on twos, amber rim, possibility echo.
- `demo/tools/qa.py`: the objective picture gates (locked-camera stability, determinism, black frames) and the twinkle report.
- Minimal example, not in the demo: a lighthouse whose lamp opens a tear. Build one tower with `genCity`'s `put(...)`, set `SHEET` to a plane through the lamp facing the camera, give the crack a short backbone around the lamp's height, and drive `fractureState` from the lamp's rotation.

## 11. Variation space

Decide per film: structure, characters (any people, creatures or entities; the archetypes Observer, Inventor and Construct are shape languages, not a cast), setting, which native moves, the before and after palettes inside the colour logic, the tear's geometry, camera path and pacing.

- **Three structures**: a single impossible event and its witness; a before/after told as two tears across one day; three small anomalies escalating to one large one.
- **Three openings**: a close-up of an ordinary object that will matter; a newspaper panel that breaks into the street; a wide quiet landscape with one wrong detail.
- **Three endings**: the two realities holding together for one frame; the character stepping through and the tear closing behind; the original world restored with one ink permanently changed.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
