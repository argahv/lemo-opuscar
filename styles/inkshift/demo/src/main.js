// INKSHIFT — The Sky Fractures (8 s proof of style). Page contract: window.render(t), window.DUR, window.READY, window.EV, window.TEXTS.
import * as THREE from 'three';
import { genCity, buildWorld, makeInkMaterial, makeSky, makeContactShadow } from './world.js';
import { makePrint } from './print.js';
import { fractureState, SHEET } from './fracture.js';
import { drawObserver } from './observer.js';
import { DUR, CUT, BLACK, OBS, camAt, EV } from './timeline.js';

THREE.ColorManagement.enabled = false;               // palette hex values go to the screen as written
const QS = new URLSearchParams(location.search);
const W = innerWidth, H = innerHeight, SS = +(QS.get('ss') ?? 2);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const G = { uInfo: { value: 0 }, uT: { value: 0 }, uTarget: { value: 7.5 * SS },
  uSheetP: { value: new THREE.Vector3(...SHEET.P) }, uSheetN: { value: new THREE.Vector3(...SHEET.N) }, uSheetD: { value: new THREE.Vector3(...SHEET.D) } };
const city = genCity();
const sceneO = new THREE.Scene(), sceneA = new THREE.Scene();
buildWorld(sceneO, city, makeInkMaterial(G, false)); sceneO.add(makeSky(G, false));
buildWorld(sceneA, city, makeInkMaterial(G, true)); sceneA.add(makeSky(G, true));
const shadow = makeContactShadow(G, OBS[0] + .02, OBS[2]); sceneO.add(shadow);

const camera = new THREE.PerspectiveCamera(47, W / H, .25, 8000);
const print = makePrint(renderer, W, H, SS);
const V = new THREE.Vector3();
const toCanvas = (p) => { V.set(...p).project(camera); return [(V.x * .5 + .5) * print.IW, (1 - (V.y * .5 + .5)) * print.IH]; };

// A 180° shutter: N sub-frames inside each frame. The camera and the rising buildings are sampled at the sub-time
// (anchored print screens would otherwise strobe when the camera moves); the Observer's pose and the tear are drawn
// at the frame time so they stay crisp on twos. Sub-frames never cross the hard cut.
const SHUT = +(QS.get('shutter') ?? 6), ANGLE = +(QS.get('angle') ?? 360) / 360, CELL = 9 * SS;
G.uTarget.value = CELL;
function render(t) {
  t = Math.max(0, Math.min(t, DUR - 1e-4));
  const F = fractureState(t), U = print.U;
  U.uLo.value = F.lo; U.uHi.value = F.hi; U.uW.value = F.w; U.uSweep.value = F.sweep; U.uOpen.value = F.open; U.uMis.value = F.mis; U.uImpact.value = F.impact;
  U.uFade.value = t >= BLACK ? 0 : 1; U.uTarget.value = CELL;
  const setCam = (ti) => {
    const c = camAt(ti);
    const o = QS.get('cam');                          // framing override for review: ?cam=x,y,z,tx,ty,tz,fov
    if (o) { const v = o.split(',').map(Number); c.pos = v.slice(0, 3); c.tgt = v.slice(3, 6); c.fov = v[6] || c.fov; }
    camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.tgt); camera.rotateZ(c.roll || 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  };
  // the Observer is a drawing: placed once per frame through the frame-time camera, so she stays crisp under the shutter
  setCam(t);
  const a = toCanvas(OBS), b = toCanvas([OBS[0], OBS[1] + 1, OBS[2]]);
  V.set(OBS[0], OBS[1] + .9, OBS[2]).applyMatrix4(camera.matrixWorldInverse);
  U.uCharInvZ.value = 1 / Math.max(-V.z, .01);
  drawObserver(print.charCanvas, t, { anchor: a, ppm: Math.hypot(b[0] - a[0], b[1] - a[1]), target: CELL, on: QS.get('nochar') == null });
  for (let j = 0; j < SHUT; j++) {
    let ti = t + ((j + .5) / SHUT - .5) * (ANGLE / 24);
    ti = t < CUT ? Math.min(ti, CUT - 1e-4) : Math.max(ti, CUT);
    ti = Math.max(0, ti);
    setCam(ti);
    G.uT.value = ti < CUT ? ti : CUT + (ti - CUT) * .2;   // the reveal holds: the other reality slows to a fifth
    print.frame({ sceneO, sceneA, camera, G, decals: [shadow] }, j, SHUT);
  }
}

window.DUR = DUR;
window.EV = EV;
window.TEXTS = () => [];                              // no on-screen text in this film
window.render = render;
render(0);
window.READY = true;
