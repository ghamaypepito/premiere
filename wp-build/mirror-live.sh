#!/bin/bash
# Render a page from the live site locally.
#
# Chromium here does not trust the agent proxy's CA, so it cannot open the
# staging site directly, and disabling certificate verification is not an
# option. curl can (its CA bundle is configured), so this fetches the page and
# its assets with verification intact and renders the copy from disk.
#
#   ./mirror-live.sh /who-we-are/ who
#
# Google Fonts is blocked from this container, so headings render in a fallback
# face. The live site requests Newsreader and Poppins correctly — check the
# markup, not the screenshot, for font questions.
set -euo pipefail
WP="https://white-cassowary-123006.hostingersite.com"
PATH_="${1:-/}"; NAME="${2:-page}"
DIR="${SCRATCH:-/tmp/pfb-mirror}"; mkdir -p "$DIR/a"; cd "$DIR"

curl -sS --max-time 60 "$WP$PATH_?cb=$RANDOM" -o "$NAME.html"
grep -ohE "https://white-cassowary-123006\.hostingersite\.com/[^\"' ]+?\.(css|js|jpg|jpeg|png|webp|svg|woff2?)" "$NAME.html" \
  | sed 's/&#038;.*//' | sort -u > "$NAME.urls"
echo "assets: $(wc -l < "$NAME.urls")"

while read -r u; do
  [ -z "$u" ] && continue
  rel="${u#https://white-cassowary-123006.hostingersite.com/}"
  mkdir -p "a/$(dirname "$rel")"
  [ -f "a/$rel" ] || curl -sS --max-time 30 "$u" -o "a/$rel" 2>/dev/null || true
done < "$NAME.urls"

python3 - "$NAME" <<'PY'
import re,sys
n=sys.argv[1]
h=open(f'{n}.html',encoding='utf-8',errors='replace').read().replace('&#038;','&')
h=re.sub(r'(https://white-cassowary-123006\.hostingersite\.com/)([^\s\'"]+?\.(?:css|js|jpg|jpeg|png|webp|svg|woff2?))(\?[^\s\'"]*)?',
         lambda m:'a/'+m.group(2), h)
open(f'{n}-local.html','w').write(h)
print('wrote', f'{n}-local.html')
PY
