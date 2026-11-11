#!/bin/sh
# Rebuild the Inkshift demo: sh styles/inkshift/demo/build.sh   (from the repo root or anywhere else)
# Sound: ElevenLabs sound effects in demo/audio/<cue>.wav (not in git; CREDITS lists every prompt). Without them the
# picture is still built, checked and saved as a silent master.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python -I"; S="$HERE/.."
mkdir -p "$HERE/out" "$HERE/qa"
cd "$LIB"
node core/render/events.mjs "$HERE"                                                                  # 1. timeline → events.json
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"   # 2. picture
$PY "$HERE/tools/qa.py" "$LIB" "$HERE" "$HERE/qa/report.json"                                       # 3. picture gates
if ls "$HERE"/audio/*.wav >/dev/null 2>&1; then
  $PY "$HERE/mix.py" "$HERE"                                                                         # 4. ElevenLabs cues on the timeline
  LEMO_COLOR=bt709 sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$S/inkshift.mp4" 24 0   # 5. −14 LUFS, no grain
else
  echo "! no demo/audio/*.wav: saving the picture as a silent master"
  cp "$HERE/out/video.mp4" "$S/inkshift.mp4"
fi
ffmpeg -v error -y -ss 6.9 -i "$S/inkshift.mp4" -frames:v 1 -q:v 2 "$S/poster.jpg"                 # 6. poster
ffmpeg -v error -y -ss 6.9 -i "$S/inkshift.mp4" -frames:v 1 -q:v 2 "$HERE/stills/styleframe.jpg"
echo "done: $S/inkshift.mp4"
