// timeline.js — one clock for picture and sound. Camera keys are continuous (24 fps); the Observer's pose keys are
// sampled on twos (12 fps) by observer.js. EV is exported for the mixer by core/render/events.mjs.
import { monotone, track } from '/core/lib.js';

export const DUR = 8.0;
export const CUT = 7.0;        // hard cut to the reveal
export const BLACK = 7.75;     // cut to black
export const OBS = [-1.0, 0, 1.2];   // the Observer's feet (world)

// —— camera: one continuous move, then the reveal ——
const A_POS = track([[0, [-.9, 1.05, 9.9]], [1.5, [-.86, 1.05, 9.15]], [3.0, [-.85, 1.05, 8.85]], [5.5, [-.85, 1.03, 8.5]], [7.0, [-1.3, 1.3, 5.7]]]);
const A_TGT = track([[0, [3.2, 4.8, -30]], [1.2, [3.3, 5.1, -30]], [2.0, [3.7, 7.0, -30]], [3.0, [4.1, 8.7, -30]], [5.5, [4.5, 10.0, -30]], [7.0, [3.6, 9.4, -30]]]);
const A_FOV = monotone([[0, 47], [3, 46], [5.5, 45], [7, 39]]);
const B_POS = track([[CUT, [.6, 9, 27]], [DUR, [.3, 10.2, 31]]]);
const B_TGT = track([[CUT, [9, 14, -200]], [DUR, [9, 15, -200]]]);
export function camAt(t) {
  if (t < CUT) {
    // the split lands as a controlled jolt: two fast decaying oscillations, no random shake
    const j = t > 3.0 ? Math.exp(-(t - 3.0) * 7) * Math.sin((t - 3.0) * 38) * .05 : 0;
    const p = A_POS(t), g = A_TGT(t);
    return { pos: [p[0], p[1] + j, p[2]], tgt: [g[0], g[1] + j * 6, g[2]], fov: A_FOV(t), roll: j * .25 };
  }
  return { pos: B_POS(t), tgt: B_TGT(t), fov: 56, roll: 0 };
}

// —— the Observer's performance (seconds → value), sampled at 12 fps ——
const K = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, monotone(v)]));
export const POSE = K({
  headPitch: [[0, -.12], [.95, -.12], [1.08, -.1], [1.3, .04], [1.55, .36], [1.75, .42], [2.4, .37], [2.95, .3], [3.05, .22], [3.35, .44], [4.6, .56], [5.4, .5], [5.7, .44], [6.4, .52], [7, .52]],
  eyeY: [[0, -.6], [.85, -.6], [.95, .9], [1.3, .65], [1.6, .3], [3, .3], [3.05, .85], [3.4, .5], [5.6, .4], [6.3, .65], [7, .65]],
  eyeX: [[0, .3], [7, .5]],
  lid: [[0, .15], [.4, .15], [.48, 1], [.56, .15], [1.0, 0], [2.95, .05], [3.0, .75], [3.09, 0], [5.5, .08], [6.3, 0], [7, 0]],
  brow: [[0, 0], [.9, 0], [1.0, .6], [1.4, .4], [2.6, .5], [3.0, .2], [3.1, 1], [4.2, .8], [5.5, .5], [6.2, .9], [7, .85]],
  mouth: [[0, 0], [2.0, 0], [2.3, .25], [2.9, .2], [3.05, .6], [3.4, .45], [4.5, .55], [5.5, .3], [6.2, .5], [7, .5]],
  lean: [[0, 0], [1.4, 0], [1.8, -.05], [2.9, -.04], [3.0, -.01], [3.2, -.12], [3.6, -.09], [5.5, -.07], [5.75, -.11], [6.2, .05], [6.6, .07], [7, .07]],
  crouch: [[0, 0], [2.92, 0], [2.98, .03], [3.15, -.01], [3.4, 0], [5.6, .02], [5.8, .035], [6.1, 0], [7, 0]],
  shoulder: [[0, 0], [1.45, 0], [1.8, .015], [3.0, .015], [3.1, .04], [3.6, .025], [5.6, .01], [6.3, .03], [7, .03]],
  armA: [[0, .06], [3.0, .06], [3.1, .32], [3.5, .2], [5.5, .18], [5.75, -.18], [6.0, .9], [6.25, 1.95], [6.5, 2.2], [7, 2.25]],
  armB: [[0, .18], [3.0, .18], [3.1, .9], [3.5, .6], [5.5, .55], [5.75, .9], [6.0, .75], [6.25, .35], [6.5, .12], [7, .1]],
  hand: [[0, .1], [5.9, .1], [6.15, .4], [6.4, 1], [7, 1]],
  wrist: [[0, .1], [5.75, .3], [6.2, -.1], [6.5, .05], [7, 0]],
  farA: [[0, .02], [3.0, .02], [3.1, .25], [3.6, .1], [6.0, .1], [6.4, -.12], [7, -.12]],
  farB: [[0, .2], [3.1, .8], [3.6, .4], [7, .35]],
});
// the other reality's light on the Observer (amber rim), and the possibility echo
export const RIM = monotone([[0, 0], [2.95, 0], [3.0, .75], [3.4, .45], [5.5, .8], [6.5, 1], [8, 1]]);
export const ECHO = monotone([[0, 0], [6.0, 0], [6.25, 1], [6.75, 1], [6.95, 0], [8, 0]]);

// —— sound events (for the mixer) ——
export const EV = [
  { t: 0, type: 'amb', id: 'city' },
  { t: .95, type: 'sfx', id: 'notice' },
  { t: 1.62, type: 'sfx', id: 'crack_tick' },
  { t: 1.62, type: 'duck', id: 'amb_down', to: -9, over: 1.3 },
  { t: 2.0, type: 'sfx', id: 'crack_run' },
  { t: 2.75, type: 'silence', id: 'breath' },
  { t: 3.0, type: 'sfx', id: 'fracture' },
  { t: 3.0, type: 'sfx', id: 'paper_tear' },
  { t: 3.3, type: 'sfx', id: 'rise' },
  { t: 5.75, type: 'sfx', id: 'reach' },
  { t: 6.05, type: 'sfx', id: 'echo' },
  { t: 7.0, type: 'sfx', id: 'reveal' },
  { t: 7.75, type: 'cut', id: 'black' },
];
