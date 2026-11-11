# Inkshift demo mix: ElevenLabs sound effects (demo/audio/*.wav, see CREDITS) placed on the timeline's events.
#   python3 mix.py <demo folder>        → <demo>/out/mix.wav (48 kHz stereo; mux.sh sets −14 LUFS)
# The cue times are the page timeline's (src/timeline.js EV); each effect is aligned by its onset, not its file start.
import sys, os, json
import numpy as np, soundfile as sf, soxr

D = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
SR, DUR, BLACK, SPLIT = 48000, 8.0, 7.75, 3.0
N = int(DUR * SR)
out = np.zeros((N, 2), np.float32)
db = lambda x: 10 ** (x / 20)

def load(name):
  x, sr = sf.read(os.path.join(D, 'audio', name + '.wav'), dtype='float32', always_2d=True)
  if x.shape[1] == 1: x = np.repeat(x, 2, 1)
  if sr != SR: x = soxr.resample(x, sr, SR)
  return x

def onset(x, rel=-28):
  a = np.abs(x).max(1); thr = a.max() * db(rel)
  i = int(np.argmax(a > thr)); return max(i - int(.004 * SR), 0)

def place(name, t, gain_db, pan=0., align=True, fade_in=.0, fade_out=.06, until=None):
  x = load(name); x = x[onset(x):] if align else x
  if until is not None: x = x[:max(int((until - t) * SR), 0)]
  n = len(x)
  if n == 0: return
  env = np.ones(n, np.float32)
  if fade_in > 0: k = min(int(fade_in * SR), n); env[:k] = np.linspace(0, 1, k)
  k = min(int(fade_out * SR), n); env[n - k:] *= np.linspace(1, 0, k)
  l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
  i0 = int(t * SR); i1 = min(i0 + n, N)
  out[i0:i1, 0] += x[:i1 - i0, 0] * env[:i1 - i0] * db(gain_db) * l
  out[i0:i1, 1] += x[:i1 - i0, 1] * env[:i1 - i0] * db(gain_db) * r

def curve(keys):   # gain automation in dB at the given times, linear between keys
  t = np.arange(N) / SR; k = np.array(keys, np.float32)
  return db(np.interp(t, k[:, 0], k[:, 1]))[:, None].astype(np.float32)

def lowpass(x, fc):   # one-pole, for the "air changes" after the split
  from scipy.signal import lfilter
  a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x, axis=0).astype(np.float32)

# —— beds ——
amb = load('amb_city'); amb = np.tile(amb, (int(np.ceil(N / len(amb))) + 1, 1))[:N]
amb_after = lowpass(amb, 900.)                                  # the same city, heard through the tear: duller, closer
mixk = np.clip((np.arange(N) / SR - SPLIT) / .4, 0, 1)[:, None]
amb = amb * (1 - mixk) + amb_after * mixk * 1.4
amb *= curve([[0, -12], [1.62, -12], [2.75, -22], [2.92, -34], [3.0, -16], [6.9, -18], [7.0, -21], [BLACK, -21], [BLACK + .02, -80], [DUR, -80]])
out += amb
dr = load('drone')[:N]; dr = np.pad(dr, ((0, max(N - len(dr), 0)), (0, 0)))[:N]
dr *= curve([[0, -40], [.8, -20], [2.7, -14], [2.96, -24], [3.0, -11], [5.5, -13], [6.9, -11], [7.0, -15], [BLACK, -15], [DUR, -40]])
out += dr

# —— events (times from src/timeline.js) ——
place('reach', .95, -24, pan=-.2)                                # the Observer notices: a breath, a coat
place('crack_tick', 1.62, -7, pan=.25)
place('crack_run', 1.98, -11, pan=.2, until=2.74)                # stops before the breath of silence
place('fracture', SPLIT, -1, pan=.15)
place('rise', 3.3, -9, pan=.35, fade_in=.25, until=BLACK)
place('reach', 5.75, -13, pan=-.2)
place('echo', 6.05, -7, pan=.1)
place('reveal', 7.0, -5, fade_out=.2)                             # rings into the black

sf.write(os.path.join(D, 'out', 'mix.wav'), np.clip(out, -1, 1), SR, subtype='PCM_24')
print('mix →', os.path.join(D, 'out', 'mix.wav'), 'peak', round(float(np.abs(out).max()), 3))
