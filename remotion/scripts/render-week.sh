#!/usr/bin/env bash
# Renderiza todos os posts de uma semana a partir de data/posts.json.
#
#   bash scripts/render-week.sh            # semana 1
#   bash scripts/render-week.sh 2          # semana 2
#   ONLY=a-conta bash scripts/render-week.sh 1   # só um post
#
# Saída: out/semana-N/<id>/ (PNG por slide/cena, MP4 para reel e story),
#        out/semana-N/legendas.md e out/semana-N.zip
#
# Usa o Remotion oficial quando node_modules/remotion existe; caso contrário
# cai no renderizador de contingência (scripts/fallback/render.mjs), que usa
# esbuild + Chromium + ffmpeg pré-instalados e produz a mesma estrutura.
set -euo pipefail
cd "$(dirname "$0")/.."

WEEK="${1:-1}"
OUT="out/semana-${WEEK}"
BROWSER="${BROWSER_EXECUTABLE:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
ONLY="${ONLY:-}"
mkdir -p "$OUT"

# Lê a lista de posts da semana (id, type, nº de slides, nº de cenas, fins das cenas)
mapfile -t POSTS < <(node -e '
  const posts = require("./data/posts.json").filter(p => p.semana === Number(process.argv[1]));
  for (const p of posts) {
    const slides = (p.slides ?? []).length;
    let acc = 0; const ends = (p.cenas ?? []).map(c => (acc += Math.round(c.duracao * 30)));
    console.log([p.id, p.type, slides, ends.join(",")].join("|"));
  }' "$WEEK")

if [ -d node_modules/remotion ]; then
  echo "== Remotion oficial =="
  for line in "${POSTS[@]}"; do
    IFS='|' read -r id type slides ends <<<"$line"
    [ -n "$ONLY" ] && [ "$ONLY" != "$id" ] && continue
    dir="$OUT/$id"; mkdir -p "$dir"
    comp="${type}-${id}"
    echo "-- $comp"
    if [ "$type" = "carrossel" ]; then
      for ((i = 0; i < slides; i++)); do
        n=$(printf "%02d" $((i + 1)))
        npx remotion still src/index.ts "$comp" "$dir/$id-slide-$n.png" \
          --frame="$i" --browser-executable="$BROWSER" --log=error
      done
    else
      # PNG por cena (frame final de cada cena) + MP4
      i=0
      IFS=',' read -ra ENDS <<<"$ends"
      for end in "${ENDS[@]}"; do
        i=$((i + 1)); n=$(printf "%02d" $i); f=$((end - 12)); [ $f -lt 0 ] && f=0
        npx remotion still src/index.ts "$comp" "$dir/$id-cena-$n.png" \
          --frame="$f" --browser-executable="$BROWSER" --log=error
      done
      npx remotion render src/index.ts "$comp" "$dir/$id.mp4" \
        --codec=h264 --pixel-format=yuv420p --crf=18 --browser-executable="$BROWSER" --log=error
    fi
  done
else
  echo "== node_modules/remotion ausente: usando renderizador de contingência =="
  if [ -n "$ONLY" ]; then
    node scripts/fallback/render.mjs --week "$WEEK" --out "$OUT" --only "$ONLY"
  else
    node scripts/fallback/render.mjs --week "$WEEK" --out "$OUT"
  fi
fi

node scripts/legendas.mjs --week "$WEEK" --out "$OUT"

(cd out && rm -f "semana-${WEEK}.zip" && zip -qr "semana-${WEEK}.zip" "semana-${WEEK}")
echo "== pronto: $OUT e out/semana-${WEEK}.zip =="
