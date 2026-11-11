# Inkshift — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Sky Fractures* (8 s, 1080×1920, 24 fps) · `inkshift.mp4` · source in [`demo/`](demo/)

## Story & structure

A lone woman on a rooftop at dusk notices a hairline of amber light in the sky. It runs down to the street, then the city splits along it: on the far side of the tear the same city exists in another reality, printed in amber and coral, lit from below, its buildings falling upward. She reaches toward it; for a moment her hand shows the reaches she almost made. Cut wide: both realities hold together, then black.

It is a proof of style, not an episode: one witness, one impossible event, one turn. It spends four native moves: the Reality Fracture (the whole film), the Impact Frame (the split), Plate Slip (around the tear) and the Possibility Echo (the reach).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0–1.5 | wide-medium: the Observer lower left on the roof, the city and its nib-crowned tower, a dark sky | slow push-in | ordinary world: midnight, teal, paper |
| 1 | 1.5–3.0 | same | tilt up following her gaze | the hairline appears at 1.62 s, grows on twos, reaches the street at 2.95 s; plates start to slip beside it |
| 1 | 3.0–3.08 | same | — | Impact Frame: the print inverts for two frames |
| 1 | 3.0–5.5 | same | a controlled jolt, then a slow drift | the sheet tears open to the right; the other reality's buildings let go of the ground and rise, hatched, lit from below |
| 1 | 5.5–7.0 | medium on the Observer | push-in, slight crane up | anticipation, then the reach on twos; Possibility Echo around the arm; amber rim on her face and coat |
| 2 | 7.0–7.75 | high wide behind her right shoulder | slow pull-back | the whole tear from sky to street; both realities in one frame |
| — | 7.75–8.0 | black | — | cut to black, sound tail |

Review stills, one per beat: [ordinary world](demo/stills/frame_01.jpg), [hairline](demo/stills/frame_02.jpg), [impact frame](demo/stills/frame_03.jpg), [the split](demo/stills/frame_04.jpg), [the reach](demo/stills/frame_05.jpg), [final image](demo/stills/frame_06.jpg); gallery card: [styleframe](demo/stills/styleframe.jpg).

## Score structure

No music cue: a tonal drone plus sound design, all ElevenLabs sound effects (`eleven_text_to_sound_v2`), placed by `demo/mix.py` on the timeline's events (`demo/src/timeline.js` `EV`), each aligned by its onset.

| Cue | At | Prompt (abridged) | Mix |
|---|---|---|---|
| amb_city | 0 | night rooftop, distant traffic, wind, one far siren | −12 dB; ducks to −22 from 1.62; near silence 2.75–3.0; after the split the same bed low-passed (the air changes) |
| drone | 0 | low strings and analog pad, slowly rising | fades in, swells into the split, steps down at the reveal |
| reach | 0.95, 5.75 | wool sleeve, sharp intake of breath | the notice (very soft) and the reach |
| crack_tick | 1.62 | thin crackle of paper and glass splitting far away | the hairline appears |
| crack_run | 1.98 | fast dry tear racing downward, ending abruptly | stops at 2.74 for the breath |
| fracture | 3.0 | one violent paper rip, sub boom, controlled impact, a tone bending down | the loudest sound in the film, the first after the silence |
| rise | 3.3 | buildings lifting: groan, steel, reversed debris | under the second half |
| echo | 6.05 | reversed swell into a detuned glass chime, slapback | the Possibility Echo |
| reveal | 7.0 | brass and low strings, minor to open chord | rings into the black |

Silence: 2.75–3.0 s, everything but the drone drops away; the fracture lands on 3.0.

## Palette & props

- Inks: midnight #101827, warm paper #F3EBDD, teal #26C6B8 (her scarf, the familiar world), amber #F4B544 (the tear, the other reality), coral #F16A59 (the other reality's sky and fractures). Building families: teal stone, paper, night, deep teal; in the other reality amber, paper with coral ink, coral with plum ink, amber-coral.
- The city: procedural blocks either side of an avenue; tops below our roof nearby, a skyline far off. The landmark at the avenue's end is a stepped tower crowned by a split pen nib (two tines, a breather ring, a needle).
- The Observer: rounded head with a bob, oversized A-line coat, teal scarf; seen in profile, facing the tear.
- The sheet stands about 45 m into the city, facing the camera; the crack's backbone leans from the street (right) to the high sky (left).

## End card

None. The film cuts to black at 7.75 s with the reveal chord's tail.

## Build notes

- `sh demo/build.sh` from anywhere: picture (`core/render/video.mjs`, 4 workers, ~15 s on Apple silicon), picture QA, mix (when `demo/audio/*.wav` exist), mux to −14 LUFS without grain, poster.
- Files: `src/main.js` (page contract, shutter loop), `src/world.js` (city, inks, screens, sky), `src/print.js` (passes and composite), `src/fracture.js` (sheet, crack, timing), `src/observer.js` (rig), `src/timeline.js` (camera keys, pose keys, events), `mix.py`, `tools/qa.py`.
- Review flags: `?cam=x,y,z,tx,ty,tz,fov` locks the camera, `?nochar` hides the Observer, `?shutter=1` turns the shutter off, `?ss=1` renders at 1× (fast drafts).
- QA on the delivered picture (`demo/qa/report.json`): locked-camera stability 0.000% changed pixels; determinism max difference 0; the hairline holds two frames then steps; no black frame before 7.75 s; twinkle (reported) 0.09–0.88% of the frame per segment, from fast camera and building motion.
- Audio: the ElevenLabs takes are not in git (`demo/audio/` is ignored); `CREDITS` lists each prompt so they can be generated again.
- Pitfalls met here: a sheet seen edge-on (the first version stood along the avenue) flattened the tear into a straight line; a paper-coloured roof box read as a hole in the frame; fine dots twinkled during the tilt until the 360° shutter and a gentler tilt.
