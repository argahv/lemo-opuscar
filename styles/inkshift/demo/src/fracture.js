// fracture.js — the Reality Fracture, defined once in world space so every camera sees the same tear.
// The tear lives on a vertical "sheet": a plane standing in the city, facing the camera like a pane of glass.
// Everything beyond the sheet is the alternate reality; the camera always stands on the original side. A ray that
// reaches the sheet before it hits anything in the original world, and meets the sheet inside the torn region, sees
// the alternate world instead. Things in front of the sheet (our roof, the Observer, the near blocks) stay original.
// Sheet coordinates: u = along the sheet (to the right), y = height. The crack is a jagged line u = crackU(y);
// the torn region opens from the crack toward +u.
import { seg, eo, mulberry, monotone } from '/core/lib.js';

const nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
export const SHEET = { P: [8, 0, -45], N: nrm([.105, 0, -.994]) };
SHEET.D = [-SHEET.N[2], 0, SHEET.N[0]];                     // along the sheet, to the right (⟂ N, horizontal)
export const N_CRACK = 64;
export const side = p => (p[0] - SHEET.P[0]) * SHEET.N[0] + (p[2] - SHEET.P[2]) * SHEET.N[2];   // > 0: beyond (alternate)
export const sheetU = p => (p[0] - SHEET.P[0]) * SHEET.D[0] + (p[2] - SHEET.P[2]) * SHEET.D[2];

// the crack's backbone: (height, u). It leans a little: right at the street, left high in the sky.
const BACKBONE = [[-80, 7], [-42, 5.5], [0, 3], [30, 0], [60, -2], [120, -5], [250, -9], [600, -16], [1400, -26]];

function buildCrack(seed = 7) {
  const r = mulberry(seed), f = monotone(BACKBONE), pts = [];
  let y = -80, s = 1;
  while (pts.length < N_CRACK) {
    // zigzag teeth, alternating sides, a few runs on one side; bigger teeth higher up where the sky is open
    const amp = (.5 + r() * 2.2) * (y > 20 ? 1.4 : 1) * (y > 200 ? 2.5 : 1);
    pts.push([y, f(y) + s * amp]);
    s = -s * (r() < .82 ? 1 : -1);
    y += y < 80 ? 2.5 + r() * 5 : y < 300 ? 6 + r() * 14 : 30 + r() * 90;
  }
  return pts;
}
export const CRACK = buildCrack();
export function crackU(y) {
  const P = CRACK; if (y <= P[0][0]) return P[0][1];
  for (let i = 0; i < P.length - 1; i++) if (y <= P[i + 1][0]) { const k = (y - P[i][0]) / (P[i + 1][0] - P[i][0]); return P[i][1] + (P[i + 1][1] - P[i][1]) * k; }
  return P[P.length - 1][1];
}
export const crackUniform = () => CRACK.flat();

// —— timing of the tear (seconds). The hairline's growth is stepped at 12 fps: it is drawn, not simulated. ——
export const FT = { appear: 1.62, reachDown: 2.95, split: 3.0, open: 3.9 };
const step12 = t => Math.floor(t * 12 + 1e-6) / 12;
export function fractureState(t) {
  const ts = step12(t);
  // phase A: a hairline appears high in the sky (y≈38) and runs both ways; down to the street by 2.95 s
  const a = seg(ts, FT.appear, FT.reachDown);
  const on = ts >= FT.appear;
  const lo = on ? 38 - eo(a) * 125 : 1e4;
  const hi = on ? 38 + eo(seg(ts, FT.appear, FT.appear + 1.0)) * 1400 : -1e4;
  const w = on ? .05 + .14 * seg(ts, FT.appear, FT.split) : 0;          // half width of the hairline (m)
  // phase B: the split. The sheet tears open to the right, fast then settling (24 fps: camera-scale motion)
  const b = seg(t, FT.split, FT.open);
  const sweep = t < FT.split ? 0 : .5 + 420 * (1 - Math.pow(1 - b, 3.2));
  // misregistration: faint near the hairline, a spike on the split, then a settled print slip
  const mis = !on ? 0 : t < FT.split ? .25 + .35 * a : Math.max(.55, 1.6 * Math.exp(-(t - FT.split) * 3.2));
  const impact = t >= FT.split && t < FT.split + 2 / 24 ? 1 : 0;          // one deliberate inverted frame pair
  return { lo, hi, w, sweep, mis, impact, open: t >= FT.split ? 1 : 0 };
}

// GLSL: the same crack, evaluated per pixel
export const CRACK_GLSL = /* glsl */`
uniform vec2 uCrack[${N_CRACK}];
float crackU(float y){
  if (y <= uCrack[0].x) return uCrack[0].y;
  float u = uCrack[${N_CRACK - 1}].y;
  for (int i = 0; i < ${N_CRACK - 1}; i++) {
    vec2 a = uCrack[i], b = uCrack[i + 1];
    if (y >= a.x && y <= b.x) { u = mix(a.y, b.y, (y - a.x) / max(b.x - a.x, 1e-3)); break; }
  }
  return u;
}`;
