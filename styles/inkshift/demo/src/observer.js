// observer.js — the Observer: a 2D rig drawn in code, posed on twos (12 fps), placed in the 3D world through the
// camera (feet anchor + pixels per metre), and drawn at the internal resolution so its ink stays crisp at any size.
// Local units are metres, y up, origin between the feet, facing +x (screen right).
// Shapes: fill → (amber rim from the other reality) → shadow screen inside a clip → keyline last.
import { clamp, lerp } from '/core/lib.js';
import { POSE, RIM, ECHO } from './timeline.js';

const INK = '#101827', PAPER = '#F3EBDD', TEAL = '#26C6B8', AMBER = '#F4B544', CORAL = '#F16A59';
const COAT = '#34496b', COAT_FAR = '#24344d', SKIN = '#ecc6a8', SKIN_S = '#c48f79', HAIR = '#131c2c', HAIR_H = '#2d4668';
const SCARF = TEAL, SCARF_S = '#178b83', LEG = '#1e2b40', EYEW = '#f6efe2';

let g = null, S = { ppm: 100, lw: .01, target: 15, rim: 0 };

// —— path helpers (Catmull-Rom through the points; a third value of 1 marks a sharp corner) ——
function spath(P, closed = true) {
  const n = P.length, k = 1 / 6;
  const get = i => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  g.moveTo(P[0][0], P[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
const path = (P, closed = true) => { g.beginPath(); spath(P, closed); };

// —— halftone fill anchored to the figure: two octaves of a dot pattern, blended, so dots stay printable while the camera pushes in ——
const cellCache = new Map();
function cell(cov, col) {
  const key = col + (Math.round(cov * 20) / 20);
  if (cellCache.has(key)) return cellCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const r = 32 * Math.sqrt(clamp(Math.round(cov * 20) / 20, 0, .78) / Math.PI) * 2 * .98;
  x.fillStyle = col; x.beginPath(); x.arc(32, 32, r, 0, Math.PI * 2); x.fill();
  for (const [cx, cy] of [[0, 0], [64, 0], [0, 64], [64, 64]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  const p = { canvas: c }; cellCache.set(key, p); return p;
}
function dots(cov, col, box = [-1, -1, 2, 3]) {
  const sm = S.target / S.ppm, base = .004;               // desired cell in metres; octave grid of 4 mm × 2^k
  const kk = Math.log2(sm / base), k0 = Math.floor(kk), f = kk - k0;
  for (const [s, a] of [[base * 2 ** k0, 1 - f], [base * 2 ** (k0 + 1), f]]) {
    if (a < .02) continue;
    const pat = g.createPattern(cell(cov, col).canvas, 'repeat');
    pat.setTransform(new DOMMatrix().rotate(45).scale(s * Math.SQRT2 / 64));
    g.globalAlpha = a; g.fillStyle = pat; g.fillRect(...box); g.globalAlpha = 1;
  }
}
// a filled, keylined shape; shade() draws inside its clip
function part(P, fill, { shade = null, lw = 1, rim = true, open = null } = {}) {
  path(P);
  if (rim && S.rim > .01) {
    g.fillStyle = AMBER; g.fill();
    g.save(); path(P); g.clip(); g.translate(-S.rim * .011, -S.rim * .002); path(P); g.fillStyle = fill; g.fill(); g.restore();
  } else { g.fillStyle = fill; g.fill(); }
  if (shade) { g.save(); path(P); g.clip(); shade(); g.restore(); }
  g.lineWidth = S.lw * lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
  if (open) { path(open, false); g.stroke(); } else { path(P); g.stroke(); }
}
const line = (P, lw = .6, col = INK) => { path(P, false); g.lineWidth = S.lw * lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); };
const clipPoly = (P) => { path(P); g.clip(); };

// —— limbs ——
function armPts(Sx, Sy, a1, a2) {
  const d1 = [Math.sin(a1), -Math.cos(a1)], E = [Sx + d1[0] * .29, Sy + d1[1] * .29];
  const d2 = [Math.sin(a1 + a2), -Math.cos(a1 + a2)], W = [E[0] + d2[0] * .25, E[1] + d2[1] * .25];
  const n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]], ne = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
  const ws = .058, we = .047, wc = .043;
  const L = [[Sx + n1[0] * ws, Sy + n1[1] * ws], [E[0] + ne[0] * we, E[1] + ne[1] * we], [W[0] + n2[0] * wc, W[1] + n2[1] * wc, 1]];
  const R = [[W[0] - n2[0] * wc, W[1] - n2[1] * wc, 1], [E[0] - ne[0] * we, E[1] - ne[1] * we], [Sx - n1[0] * ws, Sy - n1[1] * ws]];
  return { E, W, d2, poly: [...L, ...R], open: [...L, ...R] };
}
function hand(W, d2, wrist, open, fill) {
  g.save(); g.translate(W[0], W[1]); g.rotate(Math.atan2(d2[1], d2[0]) + wrist);
  const palm = [[-.012, -.034], [.05, -.036], [.072, -.02], [.074, .02], [.05, .034], [-.012, .032]];
  // fingers fan open as the hand reaches
  for (let i = 0; i < 4; i++) {
    const sp = (i - 1.5) * .2 * open, len = .052 + .02 * open - Math.abs(i - 1.2) * .006;
    g.save(); g.translate(.064, (i - 1.5) * .016); g.rotate(sp);
    part([[0, -.0085], [len, -.0075], [len + .008, 0], [len, .0075], [0, .0085]], fill, { lw: .7 });
    g.restore();
  }
  part(palm, fill, { lw: .8 });
  g.save(); g.translate(.018, .03); g.rotate(.9 - .5 * open);   // thumb
  part([[0, -.009], [.045, -.008], [.053, 0], [.045, .008], [0, .009]], fill, { lw: .7 });
  g.restore();
  g.restore();
}
function arm(Sx, Sy, a1, a2, wrist, open, cols, shadeCov = 0) {
  const A = armPts(Sx, Sy, a1, a2);
  part(A.poly, cols.sleeve, { open: A.open, shade: shadeCov ? () => dots(shadeCov, INK) : null });
  // cuff
  const n2 = [-A.d2[1], A.d2[0]], c0 = [A.W[0] - A.d2[0] * .03, A.W[1] - A.d2[1] * .03];
  line([[c0[0] + n2[0] * .043, c0[1] + n2[1] * .043], [c0[0] - n2[0] * .043, c0[1] - n2[1] * .043]], .55);
  hand(A.W, A.d2, wrist, open, cols.skin);
  return A;
}

// —— head (facing +x, origin at the head centre) ——
const FACE = [[-.104, .0], [-.09, .07], [-.02, .114], [.05, .1], [.094, .052], [.104, .022], [.099, .004], [.11, -.014], [.131, -.036, 1], [.111, -.047], [.113, -.06], [.104, -.068], [.108, -.078], [.097, -.1], [.05, -.122], [-.01, -.1], [-.062, -.06]];
const HAIR_PTS = sw => [[.086, .08], [.06, .118], [-.02, .14], [-.1, .1], [-.132, .03], [-.138 + sw, -.05], [-.112 + sw, -.106, 1], [-.06, -.088], [-.032, -.03], [.02, .05], [.068, .062, 1]];
function head(P) {
  part(FACE, SKIN, { shade: () => { g.fillStyle = SKIN_S; path([[-.12, -.075], [-.01, -.094], [.09, -.104], [.1, -.2], [-.12, -.2]]); g.fill(); } });
  // eye: almond, iris toward where she looks, lid from above
  const ex = .074, ey = .008;
  g.save(); path([[ex - .016, ey], [ex, ey + .009], [ex + .017, ey + .002, 1], [ex, ey - .008]]); g.fillStyle = EYEW; g.fill(); g.clip();
  g.fillStyle = INK; g.beginPath(); g.arc(ex + .006 + P.eyeX * .006, ey + P.eyeY * .006, .0085, 0, Math.PI * 2); g.fill();
  if (P.lid > .02) { g.fillStyle = SKIN; g.fillRect(ex - .03, ey + .012 - P.lid * .024, .06, .03); }
  g.restore();
  line([[ex - .018, ey + .002 + P.lid * .0], [ex - .004, ey + .011 - P.lid * .012], [ex + .018, ey + .004 - P.lid * .004]], 1.05);
  // brow
  const b = P.brow;
  line([[.054, .036 + b * .012], [.075, .045 + b * .016], [.097, .038 + b * .012]], 1.0);
  // mouth: a cut in the profile, opening with awe
  if (P.mouth > .05) { g.fillStyle = '#5a2430'; path([[.103, -.062], [.114, -.064 - P.mouth * .004], [.112, -.068 - P.mouth * .02], [.101, -.07 - P.mouth * .012]]); g.fill(); line([[.103, -.062], [.112, -.068 - P.mouth * .02]], .6); }
  line([[.112, -.042], [.118, -.046]], .5);           // nostril
  // hair over the head
  const hp = HAIR_PTS(P.sway);
  part(hp, HAIR, { shade: () => { line([[.03, .11], [-.06, .11], [-.11, .05]], 1.2, HAIR_H); } });
}

// —— the whole figure ——
export function poseAt(t) {
  const ts = Math.floor(Math.min(t, 7) * 12 + 1e-6) / 12;
  const P = {}; for (const k in POSE) P[k] = POSE[k](ts);
  P.sway = Math.sin(ts * 4.3) * .006 + Math.sin(ts * 9.1) * .003;
  P.ts = ts; return P;
}
function figure(P, echoA = null) {
  const hipY = .92 - P.crouch;
  // legs
  const legs = [[-.06, -.075, LEG], [.068, .1, LEG]];
  for (const [x0, x1, c] of legs) {
    part([[x0 - .05, hipY - .25], [x0 + .048, hipY - .25], [x1 + .038, .1], [x1 - .038, .1, 1]], c, { lw: .9, rim: false });
    part([[x1 - .07, 0, 1], [x1 + .13, 0, 1], [x1 + .145, .045], [x1 + .07, .1], [x1 - .06, .1]], INK, { lw: .9, rim: false });
  }
  g.save();
  g.translate(0, hipY); g.rotate(-P.lean); g.translate(0, -.92);
  const Sx = .012, Sy = 1.352 + P.shoulder;
  // far arm (behind the coat)
  g.save(); g.translate(-.035, .005);
  arm(Sx, Sy, P.farA, P.farB, .05, .1, { sleeve: COAT_FAR, skin: SKIN_S });
  g.restore();
  // coat: oversized, soft shoulders, A-line
  const coat = [[-.095, 1.452], [-.168, 1.405], [-.19, 1.3], [-.2, 1.02], [-.232, .66], [-.252, .5, 1], [.218, .52, 1], [.192, .76], [.168, 1.0], [.16, 1.24], [.13, 1.39], [.076, 1.452]];
  part(coat, COAT, { shade: () => {
    // graphic shadow on the front of the coat (light comes from behind her, the city's dusk)
    g.save(); clipPoly([[.055, 1.6], [.4, 1.6], [.4, .3], [.11, .3], [.03, .95]]); dots(.55, INK); g.restore();
    line([[-.17, 1.32], [-.186, 1.0], [-.222, .64]], 1.1, '#5d7aa3');            // the back catches the sky
  } });
  line([[.07, 1.43], [.098, 1.0], [.152, .53]], .55);                               // coat opening
  line([[.02, .82], [.085, .8]], .5);                                              // pocket
  // scarf tail behind, then the wrap
  const wv = Math.sin(P.ts * 6.2) * .012;
  part([[-.07, 1.452], [-.15, 1.37], [-.2 + wv, 1.2], [-.215 + wv, 1.13, 1], [-.165 + wv, 1.15, 1], [-.12, 1.32]], SCARF, { lw: .9 });
  // neck and head
  part([[-.025, 1.43], [.052, 1.43], [.058, 1.52], [-.02, 1.52]], SKIN, { shade: () => { g.fillStyle = SKIN_S; g.fillRect(-.05, 1.4, .2, .08); } });
  g.save(); g.translate(.016, 1.49 + P.shoulder * .5); g.rotate(P.headPitch); g.translate(.03, .1);
  head(P);
  g.restore();
  part([[-.102, 1.415], [.006, 1.405], [.092, 1.418], [.098, 1.478], [.0, 1.49], [-.1, 1.476]], SCARF, { shade: () => { g.fillStyle = SCARF_S; g.fillRect(-.12, 1.395, .25, .03); } });
  line([[-.03, 1.42], [.0, 1.474]], .5);
  // the possibility echo: the reach she almost made, and the one she is about to make
  if (echoA) for (const e of echoA) {
    g.save(); g.globalAlpha = e.alpha; g.translate(e.dx, e.dy);
    const A = armPts(Sx, Sy, e.a1, e.a2);
    path(A.poly); g.fillStyle = e.col; g.fill(); g.lineWidth = S.lw * .6; g.strokeStyle = e.line; path(A.open, false); g.stroke();
    g.save(); g.translate(A.W[0], A.W[1]); g.rotate(Math.atan2(A.d2[1], A.d2[0]) + e.wrist);
    path([[-.012, -.034], [.12, -.05], [.13, .0], [.12, .05], [-.012, .034]]); g.fill(); path([[-.012, -.034], [.12, -.05], [.13, .0], [.12, .05], [-.012, .034]]); g.stroke();
    g.restore(); g.restore();
  }
  // near arm (in front)
  arm(Sx, Sy, P.armA, P.armB, P.wrist, P.hand, { sleeve: COAT, skin: SKIN }, .35);
  g.restore();
}

// draw into the 2D canvas. cam: { project(world) → [x, y] in canvas px, ppm at the figure }.
export function drawObserver(canvas, t, { anchor, ppm, target, on = true }) {
  g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  if (!on) return;
  const P = poseAt(t);
  S.ppm = ppm; S.target = target; S.rim = RIM(Math.floor(t * 12) / 12);
  S.lw = clamp(.0105 * ppm, 2.2 * target / 15, 9 * target / 15) / ppm;
  g.setTransform(ppm, 0, 0, -ppm, anchor[0], anchor[1]);
  const ec = ECHO(P.ts);
  const echo = ec > .01 ? [
    { a1: POSE.armA(P.ts - .3), a2: POSE.armB(P.ts - .3) + .25, wrist: .2, col: CORAL, line: '#a63b33', alpha: .5 * ec, dx: -.012, dy: -.004 },
    { a1: P.armA + .38, a2: Math.max(P.armB - .1, 0), wrist: -.15, col: AMBER, line: '#b07a1e', alpha: .55 * ec, dx: .014, dy: .006 },
  ] : null;
  figure(P, echo);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
