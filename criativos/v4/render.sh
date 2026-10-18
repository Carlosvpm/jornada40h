#!/usr/bin/env bash
# Renderiza cada *.html em JPG. Uso: ./render.sh [arquivo.html ...]
# Feed: 1080x1350. Arquivos com "-story" no nome: 1080x1920.
set -e
cd "$(dirname "$0")"
files=("$@"); [ ${#files[@]} -eq 0 ] && files=(*.html)
tmp=$(mktemp -d)
for f in "${files[@]}"; do
  case "$f" in *story*) size=1080,1920 ;; *) size=1080,1350 ;; esac
  google-chrome --headless=new --disable-gpu --hide-scrollbars --no-sandbox --user-data-dir="$tmp" \
    --force-device-scale-factor=1 --virtual-time-budget=6000 --window-size=$size \
    --screenshot="$tmp/out.png" "file://$PWD/$f" >/dev/null 2>&1
  out="${f%.html}.jpg"
  python3 -c "import sys;from PIL import Image;Image.open(sys.argv[1]).convert(\"RGB\").save(sys.argv[2],quality=92)" "$tmp/out.png" "$out"
  echo "ok $out"
done
rm -rf "$tmp"
