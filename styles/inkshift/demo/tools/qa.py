# Inkshift picture QA — objective checks for the proof of style.
#   python3 tools/qa.py <LIB> <demo folder> [qa/report.json]       (needs out/video.mp4 from build.sh)
# Hard gates:
#   stability    with the camera locked, the static world must not change at all between frames: halftone, hatching,
#                keylines and windows are anchored to objects (the Observer, who moves on twos, is masked out)
#   determinism  the same timestamp rendered twice gives the same image
#   black        no black frame before the intended cut to black; no luma jump outside the intended events
# Reported (not gated): twinkle — pixels that change and change back within one frame in the film. Fast motion of fine
# dots registers here even when it reads as coherent motion; the 360° shutter keeps it low. Watch the film to judge it.
import sys, json, subprocess, os, tempfile
import numpy as np
from PIL import Image

LIB, DEMO = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else None
FPS = 24; IMPACT = (3.0, 3.0 + 2 / 24); CUT = 7.0; BLACK = 7.75
tmp = tempfile.mkdtemp(prefix='inkshift_qa_')

def stills(times, q='', prefix='s_'):
  ts = [f'{t:.7f}' for t in times]
  args = ['node', 'core/render/still.mjs', DEMO, *ts, '--size', '1080x1920', '--prefix', prefix, '--out', tmp]
  if q: args += ['--q', q]
  out = subprocess.run(args, cwd=LIB, check=True, capture_output=True, text=True).stdout.split()
  files = [w for w in out if w.endswith('.jpg')]                       # still.mjs prints each file it wrote, in order
  return [np.asarray(Image.open(f).convert('L')).astype(np.float32) for f in files]

def aba(S):
  d1 = np.abs(S[1] - S[0]); d2 = np.abs(S[2] - S[1]); d0 = np.abs(S[2] - S[0]); return (d1 > 20) & (d2 > 20) & (d0 < 6)

rep = {}
# —— stability: locked camera over three frames of the ordinary world ——
lock = 'cam=-0.9,1.05,9.5,3.4,6,-30,47'
S = stills([.5, .5 + 1 / FPS, .5 + 2 / FPS], lock, 'lk_')
mask = np.ones(S[0].shape, bool); mask[700:1920, 0:560] = False          # the Observer's region in this framing
chg = max(float((np.abs(S[1] - S[0])[mask] > 12).mean()), float((np.abs(S[2] - S[1])[mask] > 12).mean()))
rep['stability_locked_camera_changed_pct'] = round(100 * chg, 4)
# the hairline is drawn on twos: with the camera locked it must hold still for two frames, then step
H = stills([2.0, 2.0 + 1 / FPS, 2.0 + 2 / FPS], lock, 'hl_')
rep['hairline_on_twos'] = {'frame1_vs_frame2_changed_pct': round(100 * float((np.abs(H[1] - H[0])[mask] > 12).mean()), 4),
                           'frame2_vs_frame3_changed_pct': round(100 * float((np.abs(H[2] - H[1])[mask] > 12).mean()), 4)}
# —— determinism ——
A = stills([4.5], '', 'da_')[0]; B = stills([4.5], '', 'db_')[0]
rep['determinism_max_diff'] = float(np.abs(A - B).max())

# —— the film ——
src = os.path.join(DEMO, 'out', 'video.mp4')
r = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'scale=540:960:flags=area,format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True)
L = np.frombuffer(r.stdout, np.uint8).reshape(-1, 960, 540).astype(np.float32); n = len(L)
def event(i):
  for k in (i - 1, i, i + 1):
    tk = k / FPS
    if IMPACT[0] - 1e-6 <= tk < IMPACT[1] + 1 / FPS or abs(tk - CUT) < .5 / FPS or tk >= BLACK - .5 / FPS: return True
  return False
luma = L.mean((1, 2))
steps = [abs(luma[i] - luma[i - 1]) for i in range(1, n) if not event(i)]
rep['frames'] = n
rep['black_frames_before_cut'] = [round(i / FPS, 3) for i in range(n) if luma[i] < 8 and i / FPS < BLACK - 1e-6]
rep['max_luma_step_outside_events'] = round(float(max(steps)), 2)
tw = np.array([0 if event(i) else int(aba(L[i - 1:i + 2]).sum()) for i in range(1, n - 1)])
SEG = [('ordinary world', 0, 1.5), ('anomaly', 1.5, 3.0), ('fracture', 3.0, 5.5), ('reaction', 5.5, 7.0), ('final image', 7.0, 7.75)]
rep['twinkle_reported'] = {s: round(100 * float(tw[max(int(a * FPS) - 1, 0):int(b * FPS) - 1].mean()) / (540 * 960), 3) for s, a, b in SEG}
rep['pass'] = (rep['stability_locked_camera_changed_pct'] == 0 and rep['determinism_max_diff'] == 0
               and not rep['black_frames_before_cut'] and rep['max_luma_step_outside_events'] < 12)
print(json.dumps(rep, indent=1))
if OUT:
  with open(OUT, 'w') as f: json.dump(rep, f, indent=1)
sys.exit(0 if rep['pass'] else 1)
