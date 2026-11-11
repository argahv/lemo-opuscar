// world.js — the city (one layout, two realities) and the INKSHIFT surface material.
// Every surface is printed with two inks: a light ink and a dark ink, with the tones between them made by a
// halftone screen (original reality) or by line hatching (the alternate reality). Both screens are anchored to the
// object, never to the screen, and their cell size is chosen per pixel from two octaves so dots stay a printable
// size at every distance without sliding over moving surfaces.
import * as THREE from 'three';
import { mulberry, clamp } from '/core/lib.js';
import { side, sheetU, crackU } from './fracture.js';

export const GY = -42;          // street level; our rooftop is y = 0
export const INK = '#101827', PAPER = '#F3EBDD', TEAL = '#26C6B8', AMBER = '#F4B544', CORAL = '#F16A59';
export const hex = h => new THREE.Color(h);   // colour management is off: hex values go to the screen unchanged

// families: [light ink, dark ink]
const FAM_O = [['#5fa9a1', INK], [PAPER, '#2a3a52'], ['#33496a', INK], ['#24707a', INK]];
const FAM_A = [[AMBER, INK], [PAPER, '#a8432f'], [CORAL, '#2b1426'], ['#f08b4c', INK]];

// —— layout ——
export function genCity(seed = 11) {
  const r = mulberry(seed);
  const box = [], cyl = [], cone = [];
  const NOFALL = [99, 0, 0, 0];
  // fall: [t0, accel, tilt, -], pivot: [x, y, z, axisAngle]
  const put = (arr, c, s, fam, kind, fall = NOFALL, piv = null, id = 0) =>
    arr.push({ c, s, p: [fam, r(), kind, id], f: fall, r: piv || [c[0], c[1], c[2], 0] });

  // our building and its roof (original side only; the alternate copy is discarded behind the sheet)
  put(box, [-1.5, GY, 4], [15, 42, 20], 2, 0, NOFALL, null, 1);
  const par = (cx, cz, sx, sz) => put(box, [cx, 0, cz], [sx, .95, sz], 1, 1, NOFALL, null, 1);
  par(-1.5, 13.9, 15, .3); par(-1.5, -5.9, 15, .3); par(-8.85, 4, .3, 20); par(5.85, 4, .3, 20);
  put(box, [-5.2, 0, -3.4], [2.8, 2.9, 2.6], 2, 1, NOFALL, null, 2);         // stair hut (left, out of the tear's way)
  put(box, [-5.2, 2.9, -3.4], [3.1, .18, 2.9], 1, 1, NOFALL, null, 2);       // its cap
  put(box, [2.6, 0, -4.6], [2.0, .9, 1.2], 3, 1, NOFALL, null, 3);           // a.c. unit
  for (const [lx, lz] of [[-8.0, 1.2], [-6.4, 1.2], [-8.0, 2.8], [-6.4, 2.8]]) put(box, [lx, 0, lz], [.16, 2.4, .16], 2, 1, NOFALL, null, 4);
  put(cyl, [-7.2, 2.4, 2.0], [2.5, 2.9, 2.5], 3, 1, NOFALL, null, 4);        // water tank
  put(cone, [-7.2, 5.3, 2.0], [2.8, 1.0, 2.8], 2, 1, NOFALL, null, 4);
  put(box, [-8.2, 0, 9.6], [.09, 6.5, .09], 2, 1, NOFALL, null, 5);          // mast

  // the landmark at the avenue's end: a stepped tower whose crown is a split pen nib
  const TX = 15, TZ = -265, tFall = [3.55, 2.4, .012, 0], tPiv = [TX, GY, TZ, .6];
  put(box, [TX, GY, TZ], [46, 34, 42], 1, 0, tFall, tPiv, 10);
  put(box, [TX, GY + 34, TZ], [28, 84, 26], 1, 0, tFall, tPiv, 11);
  put(box, [TX, GY + 118, TZ], [20, 22, 19], 1, 0, tFall, tPiv, 12);
  put(box, [TX, GY + 140, TZ], [13, 13, 12.5], 1, 0, tFall, tPiv, 13);
  // the nib: two tines with a slit between them, a breather ring, then a fine needle
  put(box, [TX, GY + 153, TZ], [9.5, 4, 9], 2, 1, tFall, tPiv, 14);
  put(cone, [TX - 2.7, GY + 157, TZ], [4.6, 30, 7.2], 1, 1, tFall, tPiv, 14);
  put(cone, [TX + 2.7, GY + 157, TZ], [4.6, 30, 7.2], 1, 1, tFall, tPiv, 14);
  put(cyl, [TX, GY + 166, TZ], [4.2, 1.1, 4.2], 2, 1, tFall, tPiv, 15);
  put(cyl, [TX, GY + 167, TZ], [.8, 30, .8], 2, 1, tFall, tPiv, 15);

  // the city: blocks either side of the avenue (x 8…22), streets every block
  const lot = (x0, x1, z0, z1) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0 - 1.2, d = z1 - z0 - 1.2;
    if (w < 4 || d < 4) return;
    const dist = Math.hypot(cx, cz);
    // tops: low in front of our roof (we look over them), rising into a skyline
    // tops: below our roof nearby (we look over them), a skyline far off; the tower stays the tallest thing
    let top;
    if (dist < 90) top = -34 + r() * 22;
    else if (dist < 200) top = -28 + r() * 32 + (r() < .12 ? 16 : 0);
    else if (dist < 420) top = -18 + r() * 44 + (r() < .15 ? 30 : 0);
    else top = -10 + r() * 62 + (r() < .2 ? 40 : 0);
    if (Math.abs(cx - TX) < 40 && Math.abs(cz - TZ) < 60) top = Math.min(top, 10);
    const H = top - GY, fam = r() < .34 ? 1 : r() < .55 ? 0 : r() < .7 ? 3 : 2;
    // in the other reality most buildings let go of the ground soon after the tear sweeps past them
    let fall = NOFALL;
    if (side([cx, 0, cz]) > 0 && r() < .8) {
      const du = Math.max(sheetU([cx, 0, cz]) - crackU(-42), 0);
      fall = [3.1 + Math.min(du / 160, 1.2) + .45 * r(), 2.6 + 6 * r(), (r() - .5) * .022, 0];
    }
    const piv = [cx, GY, cz, r() * Math.PI * 2];
    put(box, [cx, GY, cz], [w, H, d], fam, 0, fall, piv);
    if (H > 48 && r() < .75) {                                     // setbacks
      const k = .55 + r() * .25, h2 = H * (.18 + r() * .25);
      put(box, [cx + (r() - .5) * w * .1, GY + H, cz], [w * k, h2, d * k], fam, 0, fall, piv);
      if (H > 80 && r() < .6) put(box, [cx, GY + H + h2, cz], [w * k * .55, h2 * .5, d * k * .55], fam === 1 ? 2 : 1, 1, fall, piv);
    } else if (r() < .35) {                                        // rooftop housing / tank
      const sx = 2 + r() * 3;
      if (r() < .5) put(box, [cx + (r() - .5) * w * .5, GY + H, cz + (r() - .5) * d * .5], [sx, 1.5 + r() * 2, sx * .8], 2, 1, fall, piv);
      else put(cyl, [cx + (r() - .5) * w * .5, GY + H + 1.5, cz + (r() - .5) * d * .5], [2.4, 2.6, 2.4], 3, 1, fall, piv);
    }
  };
  const block = (x0, x1, z0, z1) => {
    // split along z into 1–3 lots, along x into 1–2
    let z = z1;
    while (z > z0 + 4) {
      const dz = Math.min(z - z0, 10 + r() * 16), nx = (x1 - x0) > 26 && r() < .6 ? 2 : 1;
      for (let i = 0; i < nx; i++) { const a = x0 + (x1 - x0) * i / nx, b = x0 + (x1 - x0) * (i + 1) / nx; lot(a, b, z - dz, z); }
      z -= dz;
    }
  };
  const XL = [[-120, -82], [-72, -40], [-30, 8]], XR = [[22, 54], [64, 98], [108, 146]];
  const ZB = []; for (let z = -12; z > -720; z -= 46) ZB.push([z - 36, z]);
  for (const [z0, z1] of ZB) {
    for (const [x0, x1] of XL) block(x0, x1, z0, z1);
    for (const [x0, x1] of XR) block(x0, x1, z0, z1);
    if (z1 < -295) block(8, 22, z0, z1);                  // behind the tower the avenue is built over
  }
  // neighbours beside our building (seen in the wide shot)
  block(-40, -12, -10, 18); block(22, 48, -10, 22); block(-30, -12, 20, 44); block(22, 60, 26, 50);

  // debris that falls upward in the alternate street (only beyond the sheet)
  for (let i = 0; i < 140; i++) {
    const x = 8 + r() * 90, z = -50 - r() * 210, s = .4 + r() * r() * 3.2;
    put(box, [x, GY + r() * 6, z], [s, s * (.4 + r()), s * (.6 + r() * .8)], (r() * 4) | 0, 1,
      [3.2 + r() * 1.6 + clamp(-z / 400) * .6, 5 + r() * 10, (r() - .5) * 1.6, 0], [x, GY, z, r() * 6.28]);
  }
  // the ground
  put(box, [0, GY - 2, -300], [2400, 2, 2400], 2, 2, NOFALL, null, 0);
  return { box, cyl, cone };
}

// —— shared GLSL: two-ink print screens ——
export const PRINT_GLSL = /* glsl */`
uniform float uTarget;    // screen cell size in pixels (internal resolution)
float spot(vec2 p){ vec2 q = vec2(p.x - p.y, p.x + p.y) * .70710678; return .5 + .25 * (cos(6.2831853 * q.x) + cos(6.2831853 * q.y)); }
float lines(vec2 p, float ang){ float c = cos(ang), s = sin(ang); return .5 + .5 * cos(6.2831853 * (c * p.x + s * p.y)); }
// ink coverage mask (0 paper … 1 ink) for coverage c, from a screen field f in [0,1]
float screenMask(float f, float c){ float aa = max(fwidth(f), 1e-4) * .85; return smoothstep(1. - c - aa, 1. - c + aa, f); }
// two-octave level of detail: the cell is chosen so it stays between uTarget and 2·uTarget pixels on screen
vec4 lod(vec2 p){ float px = 1. / max(length(fwidth(p)), 1e-6); float k = log2(uTarget / px); float k0 = floor(k); return vec4(exp2(-k0), exp2(-k0 - 1.), k - k0, px); }
float halftone(vec2 p, float c){
  if (c < .005) return 0.; if (c > .995) return 1.;
  vec4 L = lod(p); float m = mix(screenMask(spot(p * L.x), c), screenMask(spot(p * L.y), c), smoothstep(.15, .85, L.z));
  return mix(0., mix(m, 1., smoothstep(.93, .995, c)), smoothstep(.005, .07, c));   // dots shrink to nothing instead of cutting off
}
float hatch(vec2 p, float c){
  if (c < .02) return 0.; if (c > .985) return 1.;
  vec4 L = lod(p);
  float a = mix(screenMask(lines(p * L.x, .7853982), min(c * 1.3, 1.)), screenMask(lines(p * L.y, .7853982), min(c * 1.3, 1.)), smoothstep(.15, .85, L.z));
  float x = c > .55 ? mix(screenMask(lines(p * L.x, -.7853982), (c - .55) * 1.8), screenMask(lines(p * L.y, -.7853982), (c - .55) * 1.8), smoothstep(.15, .85, L.z)) : 0.;
  return max(a, x);
}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

const VERT = /* glsl */`
attribute vec3 aC; attribute vec3 aS; attribute vec4 aP; attribute vec4 aF; attribute vec4 aR;
uniform float uT, uAlt;
varying vec3 vW, vO, vN, vON; varying vec4 vP; varying vec3 vS;
vec3 rotAxis(vec3 v, vec3 ax, float a){ float c = cos(a), s = sin(a); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1. - c); }
void main(){
  vec3 lp = position;
  vec3 o = vec3(lp.x * aS.x, (lp.y + .5) * aS.y, lp.z * aS.z);
  vec3 n = normalize(normal / aS);
  vO = o + aC; vON = n; vS = aS; vP = aP;
  vec3 w = aC + o;
  if (uAlt > .5) {
    // falling upward: accelerate, then hold a terminal speed so the shapes stay readable under the shutter
    float dt = max(uT - aF.x, 0.);
    float VMAX = 14.;
    float t1 = VMAX / aF.y;
    float vel = min(aF.y * dt, VMAX);
    float lift = dt < t1 ? .5 * aF.y * dt * dt : .5 * aF.y * t1 * t1 + VMAX * (dt - t1);
    vec3 rel = w - aR.xyz;
    rel.y *= 1. + min(vel * .016, .3);                  // ink stretches with the upward speed
    vec3 ax = vec3(cos(aR.w), 0., sin(aR.w));
    float ang = aF.z * dt * dt;
    rel = rotAxis(rel, ax, ang); n = rotAxis(n, ax, ang);
    w = aR.xyz + rel + vec3(0., lift, 0.);
  }
  vW = w; vN = n;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;

const FRAG = /* glsl */`
${PRINT_GLSL}
uniform float uInfo, uAlt, uT; uniform vec3 uSheetP, uSheetN;
uniform vec3 uL, uHaze, uHazeD, uLit[4], uDark[4], uWin, uWinLit;
varying vec3 vW, vO, vN, vON; varying vec4 vP; varying vec3 vS;
void main(){
  if (uAlt > .5 && dot(vW - uSheetP, uSheetN) < 0.) discard;
  vec3 n = normalize(vN);
  float kind = vP.z;
  if (uInfo > .5) {
    vec3 vn = normalize((viewMatrix * vec4(n, 0.)).xyz);
    float d = -(viewMatrix * vec4(vW, 1.)).z;
    float id = kind > 1.5 ? .05 : .1 + .9 * fract(vP.y * 97.13 + vP.x * .31);
    gl_FragColor = vec4(vn.xy, 1. / d, id); return;
  }
  int fam = int(vP.x + .5);
  vec3 lit = uLit[0], dark = uDark[0];
  if (fam == 1) { lit = uLit[1]; dark = uDark[1]; } else if (fam == 2) { lit = uLit[2]; dark = uDark[2]; } else if (fam == 3) { lit = uLit[3]; dark = uDark[3]; }
  // light: three bands per face, then a graphic gradient (pooling toward the street; in the other reality toward the sky)
  float nl = dot(n, uL);
  float v = nl > .42 ? 1. : nl > .02 ? .62 : .22;
  vec3 an = abs(vON);
  // walls of buildings get the graphic gradient; roofs and props stay clean
  if (kind < .5 && an.y < .5) {
    float hgt = clamp((vO.y - ${GY.toFixed(1)}) / 75., 0., 1.);
    v *= uAlt > .5 ? mix(1., .66, clamp((vO.y - ${GY.toFixed(1)}) / 130., 0., 1.)) : mix(.66, 1., hgt);
  }
  vec2 fp;                                   // face coordinates (object-anchored) for the screen and the windows
  if (an.y > an.x && an.y > an.z) fp = vO.xz; else if (an.x > an.z) fp = vec2(vO.z, vO.y); else fp = vec2(vO.x, vO.y);
  float c = 1. - v;
  float m = uAlt > .5 ? hatch(fp / .55, c) : halftone(fp / .5, c);
  vec3 col = mix(lit, dark, m);
  // windows: three façade types (punched grid, vertical slits, ribbon bands), kept off the ground floor and the parapet
  if (kind < .5 && an.y < .5) {
    float hc = fp.x, yy = vO.y - ${GY.toFixed(1)};
    float px = 1. / max(length(fwidth(fp)), 1e-6);
    float vis = smoothstep(6., 12., px * 3.);
    int style = int(fract(vP.y * 7.31) * 3.);
    float hx = fract(hc / 3.), hy = fract(yy / 3.6);
    float aa = clamp(1.5 / (px * 3.), .01, .2);
    float wm;
    if (style == 0) wm = smoothstep(.3 - aa, .3, hx) * (1. - smoothstep(.7, .7 + aa, hx)) * smoothstep(.3 - aa, .3, hy) * (1. - smoothstep(.76, .76 + aa, hy));
    else if (style == 1) { float sx = fract(hc / 2.2); wm = smoothstep(.42 - aa, .42, sx) * (1. - smoothstep(.62, .62 + aa, sx)); }
    else wm = smoothstep(.38 - aa, .38, hy) * (1. - smoothstep(.68, .68 + aa, hy));
    wm *= step(4.5, yy) * step(yy, vS.y - 2.2);
    wm *= vis;
    vec2 cell = floor(vec2(hc / 3., yy / 3.6));
    float lt = h21(cell + vP.y * 91.7);
    vec3 wc = lt < (uAlt > .5 ? .05 : .1) ? uWinLit : mix(dark, uWin, .18 + .22 * v);
    col = mix(col, wc, wm * (style == 2 ? .85 : 1.));
  }
  // street markings on the ground
  if (kind > 1.5 && an.y > .5) {
    float ax = abs(vW.x - 15.);
    float dash = step(ax, .18) * step(fract(vW.z / 8.), .55);
    float kerb = step(abs(ax - 7.), .22);
    float ppx = 1. / max(length(fwidth(vW.xz)), 1e-6);
    col = mix(col, uWinLit, (dash + kerb) * smoothstep(1.5, 4., ppx * .36));
  }
  float dist = length(vW - cameraPosition);
  col = mix(col, uHaze, smoothstep(uHazeD.x, uHazeD.y, dist) * uHazeD.z);
  gl_FragColor = vec4(col, 1.);
}`;

export function makeInkMaterial(G, alt) {
  const fam = alt ? FAM_A : FAM_O;
  return new THREE.ShaderMaterial({
    uniforms: {
      ...G, uAlt: { value: alt ? 1 : 0 },
      uL: { value: (alt ? new THREE.Vector3(.5, -.55, .67) : new THREE.Vector3(-.55, .5, .67)).normalize() },
      uLit: { value: fam.map(f => hex(f[0])) }, uDark: { value: fam.map(f => hex(f[1])) },
      uHaze: { value: hex(alt ? '#ec8f5e' : '#25505b') }, uHazeD: { value: new THREE.Vector3(alt ? 120 : 90, alt ? 650 : 560, alt ? .78 : .84) },
      uWin: { value: hex(alt ? '#ffe2a8' : '#5f8fa0') }, uWinLit: { value: hex(alt ? INK : '#f6e7c8') },
    },
    vertexShader: VERT, fragmentShader: FRAG,
  });
}

function instGeo(base, items) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('normal', base.getAttribute('normal'));
  const n = items.length, A = (k, sz) => new Float32Array(n * sz);
  const aC = A(0, 3), aS = A(0, 3), aP = A(0, 4), aF = A(0, 4), aR = A(0, 4);
  items.forEach((it, i) => { aC.set(it.c, i * 3); aS.set(it.s, i * 3); aP.set(it.p, i * 4); aF.set(it.f, i * 4); aR.set(it.r, i * 4); });
  for (const [k, v, s] of [['aC', aC, 3], ['aS', aS, 3], ['aP', aP, 4], ['aF', aF, 4], ['aR', aR, 4]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(v, s));
  g.instanceCount = n;
  return g;
}
export function buildWorld(scene, city, mat) {
  const prims = [[new THREE.BoxGeometry(1, 1, 1), city.box], [new THREE.CylinderGeometry(.5, .5, 1, 20), city.cyl], [new THREE.ConeGeometry(.5, 1, 4).rotateY(Math.PI / 4), city.cone]];
  for (const [geo, items] of prims) if (items.length) { const m = new THREE.Mesh(instGeo(geo, items), mat); m.frustumCulled = false; scene.add(m); }
}

// —— skies ——
const SKY_FRAG = /* glsl */`
${PRINT_GLSL}
uniform float uInfo, uAlt, uT;
uniform vec3 uS0, uS1, uS2, uS3, uS4, uCloud, uCloudEdge;
varying vec3 vD;
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h21(vec2(i, 3.1)), h21(vec2(i + 1., 3.1)), f); }
void main(){
  if (uInfo > .5) { gl_FragColor = vec4(0., 0., 0., 0.); return; }
  vec3 d = normalize(vD);
  float el = asin(clamp(d.y, -1., 1.)), az = atan(d.x, -d.z);
  vec2 p = vec2(az, el) * 95.;                       // the screen is anchored to directions, like stars
  // five inks from horizon to zenith; neighbours meet through a halftone, never a smooth gradient
  float g = clamp(el / .62, 0., 1.);
  g = pow(g, .75);
  float x = g * 4.;
  float i = floor(x), f = fract(x);
  vec3 a = i < 1. ? uS0 : i < 2. ? uS1 : i < 3. ? uS2 : uS3;
  vec3 b = i < 1. ? uS1 : i < 2. ? uS2 : i < 3. ? uS3 : uS4;
  float k = smoothstep(.45, 1., f);
  vec3 col = mix(a, b, halftone(p, k));
  if (el < .006) col = uS0;
  // cut-paper clouds: flat shapes with one lit edge
  float band = smoothstep(.06, .12, el) * (1. - smoothstep(.36, .46, el));
  float cl = n1(az * 5.3 + 11.) * .6 + n1(az * 13.1 + el * 40.) * .4;
  float yy = fract(el * 7.5 + n1(az * 3.) * .7);
  float shape = step(.62, cl) * step(.5, yy) * step(yy, .5 + .26 * cl) * band;
  float edge = shape * step(yy, .52 + .03 * cl);
  col = mix(col, uCloud, shape);
  col = mix(col, uCloudEdge, edge);
  gl_FragColor = vec4(col, 1.);
}`;
export function makeSky(G, alt) {
  const S = alt ? ['#e85d4f', CORAL, '#f68e57', AMBER, '#f7d58f'] : ['#d9cfb8', '#2f6a70', '#1d4658', '#16283d', INK];
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...G, uAlt: { value: alt ? 1 : 0 },
      uS0: { value: hex(S[0]) }, uS1: { value: hex(S[1]) }, uS2: { value: hex(S[2]) }, uS3: { value: hex(S[3]) }, uS4: { value: hex(S[4]) },
      uCloud: { value: hex(alt ? '#f7c56e' : '#203a52') }, uCloudEdge: { value: hex(alt ? PAPER : '#3b8a8b') } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.); }`,
    fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(3000, 64, 32), mat); m.frustumCulled = false; m.renderOrder = -1;
  return m;
}

// —— the Observer's contact shadow on the roof ——
export function makeContactShadow(G, x, z) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...G },
    vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU = uv * 2. - 1.; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${PRINT_GLSL}
      uniform float uInfo; varying vec2 vU; varying vec3 vW;
      void main(){ float r = length(vU); if (r > 1.) discard;
        if (uInfo > .5) discard;
        float c = 1. - smoothstep(.35, 1., r); float m = halftone(vW.xz / .12, c * .95); if (m < .5) discard;
        gl_FragColor = vec4(${hex(INK).toArray().map(v => v.toFixed(4)).join(',')}, 1.); }`,
    transparent: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .9).rotateX(-Math.PI / 2), mat);
  m.position.set(x, .012, z); return m;
}
