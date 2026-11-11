// print.js — the print pipeline. Both realities are rendered twice at 2× (colour, then an info pass holding view
// normal, 1/depth and object id). One composite pass then:
//   1. decides per pixel which reality is seen (the ray meets the fracture sheet before any original surface, inside the tear)
//   2. draws ink keylines from the info buffers (silhouettes heavier near the camera, creases thinner, distance thins them)
//   3. slips the colour plates against the keylines (misregistration) only where the story asks for it
//   4. draws the tear itself: keyline, torn paper fringe, amber light printed as halftone
//   5. lays the Observer (drawn in 2D at full resolution) into the scene at its depth
// A last pass box-filters 2× down to the output size.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CRACK_GLSL, N_CRACK, crackUniform, SHEET } from './fracture.js';
import { PRINT_GLSL, hex, INK, PAPER, AMBER } from './world.js';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const COMP = /* glsl */`
${PRINT_GLSL}
${CRACK_GLSL}
varying vec2 vUv;
uniform sampler2D tCO, tIO, tCA, tIA, tChar;
uniform vec2 uRes; uniform float uSS;
uniform mat4 uInvProj, uCamWorld; uniform vec3 uCamPos, uCamFwd;
uniform vec3 uSheetP, uSheetN, uSheetD;
uniform float uLo, uHi, uW, uSweep, uOpen, uMis, uImpact, uCharInvZ, uCharOn, uFade, uRim;
uniform vec3 uInk, uPaper, uAmber;

float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
float vn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h21(vec2(i, 1.7)), h21(vec2(i + 1., 1.7)), f); }
vec3 nrm(vec4 I){ return vec3(I.xy, sqrt(max(0., 1. - dot(I.xy, I.xy)))); }

// keyline strength from an info buffer
float keyline(sampler2D tI, vec2 uv){
  vec4 C = texture2D(tI, uv);
  float iz = C.z; if (iz <= 0.) return 0.;            // sky: lines come from the surfaces in front of it
  float z = 1. / iz;
  float near = 1. - smoothstep(4., 140., z);
  float rS = uSS * mix(1.15, 3.3, near);                // silhouette radius in internal px
  float rC = uSS * mix(.75, 1.5, near);                 // crease radius
  vec3 nc = nrm(C);
  float sil = 0., cre = 0.;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * .78539816;
    vec2 dir = vec2(cos(a), sin(a)) / uRes;
    vec4 S = texture2D(tI, uv + dir * rS);
    // silhouette: the neighbour is clearly farther (this pixel belongs to the front surface)
    if (S.z < iz * .93) sil = 1.;
    // another object at a similar depth
    if (abs(S.w - C.w) > .002 && S.z < iz * 1.02) sil = max(sil, .9);
    vec4 Q = texture2D(tI, uv + dir * rC);
    if (Q.z > 0. && dot(nc, nrm(Q)) < .8 && abs(Q.z - iz) < iz * .08) cre = max(cre, .75);
  }
  float fade = 1. - .7 * smoothstep(220., 900., z);
  return max(sil, cre) * fade;
}

void main(){
  vec2 uv = vUv;
  vec4 IO = texture2D(tIO, uv);
  // —— the ray, and where it meets the sheet ——
  vec4 vp = uInvProj * vec4(uv * 2. - 1., 1., 1.); vp /= vp.w;
  vec3 rd = normalize((uCamWorld * vec4(normalize(vp.xyz), 0.)).xyz);
  float inWin = 0., ePx = 1e4, tearOn = 0., u = 0., y = 0., scale = 1.;
  float rn = dot(rd, uSheetN), cs = dot(uSheetP - uCamPos, uSheetN);
  if (rn > 1e-4 && cs > 0. && uHi > uLo) {
    float th = cs / rn;
    vec3 hp = uCamPos + rd * th;
    float hz = th * dot(rd, uCamFwd);
    u = dot(hp - uSheetP, uSheetD); y = hp.y;
    scale = max(length(vec2(dFdx(u), dFdy(u))), 1e-5);        // sheet units per pixel
    // fine teeth on top of the authored zigzag
    float uc = crackU(y) + (vn1(y * 1.3) - .5) * .7 + (vn1(y * 4.1 + 5.) - .5) * .25;
    float e;
    if (uOpen < .5) {
      float taper = smoothstep(uLo, uLo + 5., y) * smoothstep(uHi, uHi - 5., y);
      e = uW * taper - abs(u - uc);
      if (y < uLo || y > uHi) e = -1e4;
    } else {
      e = min(u - (uc - uW), uc + uSweep - u);
    }
    ePx = e / scale;
    // where the sheet is seen almost edge-on its coordinates race across pixels: the tear fades out there
    float graze = smoothstep(.04, .1, rn) * (1. - smoothstep(3.5, 9., scale));
    if (graze < .5) ePx = -1e4;
    if (IO.z < 1. / hz) {                                 // nothing original in front of the sheet here
      tearOn = 1.;
      if (uOpen > .5 && ePx > 0.) inWin = 1.;
    }
  }
  // —— misregistration: plates slip against the keylines near the tear and inside the other reality ——
  float misMask = tearOn * (inWin * .6 + exp(-abs(ePx) / (70. * uSS)));
  vec2 off = vec2(.8, -.55) * uMis * misMask * 4.5 * uSS / uRes;
  float charHere = 0.;
  vec4 CH = texture2D(tChar, uv);
  if (uCharOn > .5 && CH.a > .002 && uCharInvZ > IO.z * .999) charHere = CH.a;
  vec3 col;
  if (inWin > .5) col = vec3(texture2D(tCA, uv + off).r, texture2D(tCA, uv - off * .6).gb);
  else col = vec3(texture2D(tCO, uv + off).r, texture2D(tCO, uv - off * .6).gb);
  // —— keylines ——
  float k = inWin > .5 ? keyline(tIA, uv) : keyline(tIO, uv);
  vec3 lineCol = inWin > .5 ? mix(uInk, vec3(.17, .07, .12), .35) : uInk;
  col = mix(col, lineCol, k);
  // —— the tear ——
  if (tearOn > .5) {
    float fr = (3.5 + 9. * vn1(y * 1.3 + u * .05)) * uSS;          // torn paper fringe, irregular
    float lw = 1.6 * uSS;
    if (uOpen < .5) {
      // the hairline: hot paper core, amber, paper fringe, amber light printed as dots around it
      float g = exp(-max(-ePx, 0.) / (26. * uSS));
      float dots = halftone(vec2(u, y) / .6, g * .85);
      col = mix(col, uAmber, dots * step(ePx, 0.) * step(-150. * uSS, ePx));
      col = mix(col, uPaper, step(-fr * .55, ePx) * step(ePx, 0.));
      col = mix(col, uInk, step(-fr * .55 - lw, ePx) * step(ePx, -fr * .55));
      col = mix(col, mix(uAmber, vec3(1., .97, .88), smoothstep(0., 3. * uSS, ePx)), step(0., ePx));
    } else {
      float a = abs(ePx);
      // outside (original side): ink, paper fringe, ink; inside: amber light falling off over the other reality
      if (ePx < 0.) {
        col = mix(col, uPaper, step(a, fr + lw));
        col = mix(col, uInk, step(a, fr + 2. * lw) * step(fr + lw, a));
        col = mix(col, uInk, step(a, lw));
      } else {
        float g = exp(-a / (45. * uSS));
        float dots = halftone(vec2(u, y) / .6, g * .9);
        col = mix(col, uAmber, dots);
        col = mix(col, uInk, step(a, lw));
      }
    }
  }
  // —— the Observer, at its depth ——
  col = mix(col, CH.rgb, charHere);
  // —— impact frame: the print inverts for two frames ——
  if (uImpact > .5) { float l = lum(col); col = mix(uPaper, uInk, smoothstep(.25, .6, l)); }
  // —— paper ——
  vec2 pc = gl_FragCoord.xy / uSS;
  float fib = h21(floor(pc / 2.)) * .5 + h21(floor(pc / 7.) + 3.) * .5;
  col *= 1. - .045 * fib;
  col = mix(uInk, col, uFade);
  gl_FragColor = vec4(col, 1.);
}`;

export function makePrint(renderer, W, H, SS) {
  const IW = W * SS, IH = H * SS;
  const rt = (float) => new THREE.WebGLRenderTarget(IW, IH, { type: float ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const T = { CO: rt(false), IO: rt(true), CA: rt(false), IA: rt(true), comp: rt(false) };
  T.IO.texture.minFilter = T.IO.texture.magFilter = T.IA.texture.minFilter = T.IA.texture.magFilter = THREE.NearestFilter;
  const charCanvas = document.createElement('canvas'); charCanvas.width = IW; charCanvas.height = IH;
  const charTex = new THREE.CanvasTexture(charCanvas); charTex.minFilter = charTex.magFilter = THREE.LinearFilter; charTex.generateMipmaps = false;
  charTex.premultiplyAlpha = false;
  const U = {
    tCO: { value: T.CO.texture }, tIO: { value: T.IO.texture }, tCA: { value: T.CA.texture }, tIA: { value: T.IA.texture }, tChar: { value: charTex },
    uRes: { value: new THREE.Vector2(IW, IH) }, uSS: { value: SS }, uTarget: { value: 7.5 * SS },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uCamFwd: { value: new THREE.Vector3() },
    uSheetP: { value: new THREE.Vector3(...SHEET.P) }, uSheetN: { value: new THREE.Vector3(...SHEET.N) }, uSheetD: { value: new THREE.Vector3(...SHEET.D) }, uLo: { value: 0 }, uHi: { value: 0 }, uW: { value: 0 }, uSweep: { value: 0 }, uOpen: { value: 0 }, uMis: { value: 0 }, uImpact: { value: 0 },
    uCharInvZ: { value: 0 }, uCharOn: { value: 1 }, uFade: { value: 1 }, uRim: { value: 0 },
    uCrack: { value: crackUniform().reduce((a, v, i) => { if (i % 2 === 0) a.push(new THREE.Vector2(v, 0)); else a[a.length - 1].y = v; return a; }, []) },
    uInk: { value: hex(INK) }, uPaper: { value: hex(PAPER) }, uAmber: { value: hex(AMBER) },
  };
  if (U.uCrack.value.length !== N_CRACK) throw new Error('crack size');
  const comp = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: COMP, depthTest: false, depthWrite: false }));
  // shutter: sub-frames are summed here (camera and rising buildings blur; poses and the tear stay crisp)
  T.acc = new THREE.WebGLRenderTarget(IW, IH, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const add = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: T.comp.texture }, w: { value: 1 } }, vertexShader: VS,
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform float w; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.); }`,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
  const down = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: T.acc.texture } }, vertexShader: VS,
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.); }`, depthTest: false, depthWrite: false }));

  function frame({ sceneO, sceneA, camera, G, decals = [] }, j = 0, N = 1) {
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    renderer.setClearColor(0x000000, 0);
    const pass = (scene, info, target) => {
      G.uInfo.value = info ? 1 : 0;
      for (const d of decals) d.visible = !info;
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
    };
    pass(sceneO, false, T.CO); pass(sceneO, true, T.IO);
    pass(sceneA, false, T.CA); pass(sceneA, true, T.IA);
    G.uInfo.value = 0;
    U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld);
    U.uCamPos.value.copy(camera.position); camera.getWorldDirection(U.uCamFwd.value);
    charTex.needsUpdate = true;
    renderer.setRenderTarget(T.comp); comp.render(renderer);
    renderer.setRenderTarget(T.acc);
    if (j === 0) { renderer.setClearColor(0x000000, 1); renderer.clear(); }
    const ac = renderer.autoClear; renderer.autoClear = false;
    add.material.uniforms.w.value = 1 / N; add.render(renderer);
    renderer.autoClear = ac;
    if (j === N - 1) { renderer.setRenderTarget(null); down.render(renderer); }
  }
  return { frame, U, charCanvas, IW, IH };
}
