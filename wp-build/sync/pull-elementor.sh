#!/usr/bin/env bash
#
# Pull Elementor's source data out of WordPress.
#
# Run this ON THE SERVER over SSH, from the WordPress root:
#
#     cd ~/domains/<your-domain>/public_html
#     bash pull-elementor.sh
#
# It writes pfb-export/ containing one JSON file per page and per Theme Builder
# template, plus a manifest, and tars the lot. Download that tar and drop it in
# the repo under wp-build/sync/pulled/.
#
# Why WP-CLI rather than the REST API: _elementor_data is protected meta, so
# WordPress does not expose it over REST even to an authenticated request. This
# reads it straight from the database, and it also sidesteps the CDN stripping
# the Authorization header.
set -euo pipefail

OUT="pfb-export"
rm -rf "$OUT"; mkdir -p "$OUT"

if ! command -v wp >/dev/null 2>&1; then
  echo "WP-CLI not found. Hostinger usually ships it; try 'wp --info' or ask support." >&2
  exit 1
fi

wp --info >/dev/null || { echo "WP-CLI cannot reach this WordPress install. Are you in the site root?" >&2; exit 1; }

echo "{" > "$OUT/manifest.json"
first=1

dump() {                       # dump <post_type>
  local type="$1"
  for id in $(wp post list --post_type="$type" --post_status=publish --format=ids); do
    local slug title data
    slug=$(wp post get "$id" --field=post_name)
    title=$(wp post get "$id" --field=post_title)
    data=$(wp post meta get "$id" _elementor_data 2>/dev/null || true)
    [ -z "$data" ] && continue          # not an Elementor document

    printf '%s' "$data" > "$OUT/${type}-${id}-${slug}.json"

    [ $first -eq 0 ] && printf ',\n' >> "$OUT/manifest.json"
    first=0
    printf '  "%s": {"type":"%s","slug":"%s","title":%s,"modified":"%s"}' \
      "$id" "$type" "$slug" "$(printf '%s' "$title" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
      "$(wp post get "$id" --field=post_modified)" >> "$OUT/manifest.json"
    echo "  $type $id  $slug"
  done
}

echo "pages:"
dump page
echo "templates:"
dump elementor_library

printf '\n}\n' >> "$OUT/manifest.json"
python3 -c "import json;json.load(open('$OUT/manifest.json'))" && echo "manifest ok"

tar czf pfb-export.tar.gz "$OUT"
echo
echo "Wrote pfb-export.tar.gz ($(du -h pfb-export.tar.gz | cut -f1)). Download it and unpack into"
echo "the repo at wp-build/sync/pulled/ , then run: node wp-build/sync/compare.js"
