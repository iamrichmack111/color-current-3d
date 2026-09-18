#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUTDIR="${2:-$HOME/Downloads/DEMOS}"
mkdir -p "$OUTDIR"
fail(){ echo "ERROR: $*" >&2; exit 1; }
for cmd in python3 ffmpeg ffprobe curl; do command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: $cmd"; done

CARDS="$ROOT/media/cards"
required=(00-intro.png 01-start.png 02-reef.png 03-catch.png 04-progress.png 05-giant.png 06-outro.png)
for f in "${required[@]}"; do [[ -s "$CARDS/$f" ]] || fail "missing video card: $CARDS/$f"; done

WORK="$(mktemp -d "${TMPDIR:-/tmp}/color-current-final.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

CACHE="$HOME/.cache/fraction-food-truck-demo-v3"
VOICE_DIR="$CACHE/voices/ryan-high"
VENV="$CACHE/piper-1.8-venv"
MODEL="$VOICE_DIR/en_US-ryan-high.onnx"
CONFIG="$VOICE_DIR/en_US-ryan-high.onnx.json"
MODEL_URL='https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx?download=true'
CONFIG_URL='https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json?download=true'
mkdir -p "$VOICE_DIR"

if [[ "${COLOR_CURRENT_AUDIO_TEST:-0}" != "1" ]]; then
  if [[ ! -s "$MODEL" || $(wc -c < "$MODEL" 2>/dev/null || echo 0) -lt 100000000 ]]; then
    echo "Downloading Piper Ryan High model..."
    rm -f "$MODEL" "$MODEL.part"
    curl -fL --retry 5 --retry-all-errors --connect-timeout 20 "$MODEL_URL" -o "$MODEL.part" || fail "Ryan High model download failed"
    mv "$MODEL.part" "$MODEL"
  else
    echo "REUSING PROVEN RYAN HIGH MODEL: $MODEL"
  fi
  if [[ ! -s "$CONFIG" ]]; then
    echo "Downloading Ryan High config..."
    rm -f "$CONFIG" "$CONFIG.part"
    curl -fL --retry 5 --retry-all-errors --connect-timeout 20 "$CONFIG_URL" -o "$CONFIG.part" || fail "Ryan High config download failed"
    mv "$CONFIG.part" "$CONFIG"
  fi
  [[ -s "$MODEL" && -s "$CONFIG" ]] || fail "Ryan High model/config missing"
  bytes="$(wc -c < "$MODEL")"; (( bytes > 100000000 )) || fail "Ryan High model incomplete: ${bytes} bytes"
  python3 - "$CONFIG" <<'PY'
import json,sys
with open(sys.argv[1],encoding='utf-8') as f: d=json.load(f)
assert isinstance(d,dict) and d
print('RYAN CONFIG OK')
PY
  if [[ ! -x "$VENV/bin/python" ]] || ! "$VENV/bin/python" -c 'import piper' >/dev/null 2>&1; then
    echo "Installing Piper TTS 1.8.0 in the proven cache location..."
    rm -rf "$VENV"
    python3 -m venv "$VENV" || fail "python3-venv is required: sudo apt install python3-venv"
    "$VENV/bin/python" -m pip install --upgrade pip >/dev/null
    "$VENV/bin/python" -m pip install 'piper-tts==1.8.0' || fail "Piper installation failed"
  else
    echo "REUSING PROVEN PIPER ENVIRONMENT: $VENV"
  fi
  PIPER="$VENV/bin/python"
  "$PIPER" -c 'import piper; print("PIPER IMPORT OK")' || fail "Piper import failed"
fi

piper_synth(){
  local text="$1" out="$2"
  rm -f "$out"
  if [[ "${COLOR_CURRENT_AUDIO_TEST:-0}" == "1" ]]; then
    ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'sine=frequency=220:sample_rate=22050:duration=1.25' -ac 1 -c:a pcm_s16le "$out"
  else
    printf '%s\n' "$text" | "$PIPER" -m piper --model "$MODEL" --config "$CONFIG" --output-file "$out" || fail "Piper synthesis failed"
  fi
  [[ -s "$out" ]] || fail "Piper produced no WAV: $out"
}

check_audio(){
  local f="$1" label="$2" dur maxv
  dur="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f" 2>/dev/null || true)"
  [[ -n "$dur" ]] || fail "$label has no duration"
  python3 - "$dur" <<'PY'
import sys
v=float(sys.argv[1]); assert v >= 0.30, f'audio too short: {v}'; print(f'duration={v:.2f}s')
PY
  maxv="$(ffmpeg -hide_banner -nostats -i "$f" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \([^ ]*\) dB.*/\1/p' | tail -n1)"
  [[ -n "$maxv" && "$maxv" != "-inf" ]] || fail "$label is silent"
  python3 - "$maxv" <<'PY'
import sys
v=float(sys.argv[1]); assert v > -55, f'audio too quiet: {v} dBFS'; print(f'max_volume={v:.1f} dBFS')
PY
  echo "AUDIO OK: $label"
}

process_voice(){
  local text="$1" raw="$2" out="$3"
  piper_synth "$text" "$raw"
  check_audio "$raw" "raw Piper voice"
  ffmpeg -hide_banner -loglevel error -y -i "$raw" \
    -af "highpass=f=70,lowpass=f=14000,volume=1.50,acompressor=threshold=-18dB:ratio=2:attack=20:release=220,loudnorm=I=-16:LRA=7:TP=-1.5" \
    -ar 48000 -ac 1 -c:a pcm_s16le "$out"
  check_audio "$out" "processed Piper voice"
}

VOICE_TEST="$OUTDIR/color-current-3d-voice-test.wav"
process_voice "Welcome to Color Current 3D. This is the high quality Ryan voice test. If you can hear this clearly, narration is working correctly." "$WORK/test-raw.wav" "$VOICE_TEST"
echo "VOICE TEST READY: $VOICE_TEST"

texts=(
"Color Current 3D is a lightweight underwater learning game that combines color recognition, spelling, exploration, and progression in one fast browser experience."
"The run begins with a clear objective and a simple dive into the reef. The interface stays focused so the player can start immediately without a complicated setup."
"During play, the heads up display tracks coins, fish caught, level, growth, rank, and the next objective while the player explores the underwater world."
"Every catch becomes a quick learning challenge. Identify the fish color, spell it correctly, and get immediate feedback before returning to the reef."
"Coins and correct answers drive progression. New levels, stronger catches, and larger goals give the player a reason to keep practicing instead of repeating the same task."
"The run culminates with the Reef Giant, giving the learning loop a visible final milestone and a satisfying sense of completion."
"Color Current 3D turns a simple color and spelling exercise into a compact game loop that is easy to run, easy to understand, and designed for repeat play."
)
images=(
"$CARDS/00-intro.png" "$CARDS/01-start.png" "$CARDS/02-reef.png" "$CARDS/03-catch.png" "$CARDS/04-progress.png" "$CARDS/05-giant.png" "$CARDS/06-outro.png"
)

: > "$WORK/audio-list.txt"
: > "$WORK/video-list.txt"
for i in "${!texts[@]}"; do
  n=$((i+1)); raw="$WORK/voice-$n-raw.wav"; voice="$WORK/voice-$n.wav"; padded="$WORK/audio-$n.wav"
  echo "Preparing narration $n of ${#texts[@]}..."
  process_voice "${texts[$i]}" "$raw" "$voice"
  adur="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$voice")"
  dur="$(python3 - "$adur" <<'PY'
import sys; print(f'{float(sys.argv[1])+0.45:.3f}')
PY
)"
  ffmpeg -hide_banner -loglevel error -y -i "$voice" -af 'apad=pad_dur=0.45' -t "$dur" -ar 48000 -ac 1 -c:a pcm_s16le "$padded"
  printf "file '%s'\n" "$padded" >> "$WORK/audio-list.txt"
  printf "file '%s'\n" "${images[$i]}" >> "$WORK/video-list.txt"
  printf "duration %s\n" "$dur" >> "$WORK/video-list.txt"
done
# Concat image demuxer needs the last image repeated so its final duration is honored.
last_index=$((${#images[@]}-1))
printf "file '%s'\n" "${images[$last_index]}" >> "$WORK/video-list.txt"

echo "Assembling one narration track..."
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$WORK/audio-list.txt" -c copy "$WORK/narration.wav" || fail "audio concat failed"
check_audio "$WORK/narration.wav" "combined narration"

echo "Encoding one 1080p video track..."
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$WORK/video-list.txt" \
  -vf "fps=30,format=yuv420p" -c:v libx264 -preset ultrafast -tune stillimage -crf 18 -profile:v high -pix_fmt yuv420p -movflags +faststart "$WORK/video.mp4" \
  || fail "video encode failed"
[[ -s "$WORK/video.mp4" ]] || fail "video track missing"

FINAL="$OUTDIR/color-current-3d-demo.mp4"
rm -f "$FINAL"
echo "Muxing verified narration into the final MP4..."
ffmpeg -hide_banner -loglevel error -y -i "$WORK/video.mp4" -i "$WORK/narration.wav" -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$FINAL" || fail "final MP4 mux failed"
[[ -s "$FINAL" ]] || fail "final MP4 missing"
video_codec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "$FINAL")"
audio_codec="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "$FINAL")"
[[ "$video_codec" == h264 ]] || fail "final video codec is $video_codec, expected h264"
[[ "$audio_codec" == aac ]] || fail "final audio codec is $audio_codec, expected aac"
ffmpeg -hide_banner -loglevel error -y -i "$FINAL" -vn -ac 1 -ar 48000 "$WORK/final.wav"
check_audio "$WORK/final.wav" "final MP4 narration"
finaldur="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$FINAL")"
size="$(du -h "$FINAL" | awk '{print $1}')"
echo "SUCCESS"
echo "DURATION: ${finaldur}s"
echo "SIZE: $size"
echo "VOICE TEST: $VOICE_TEST"
echo "DEMO READY: $FINAL"
