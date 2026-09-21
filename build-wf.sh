#!/bin/sh
# Assembles parts/<Name>.body.html + _wfstyle.css into <Name>.dc.html artboards.
set -e
for f in parts/*.body.html; do
  n=$(basename "$f" .body.html)
  {
    printf '%s\n' '<!doctype html>'
    printf '%s\n' '<html>'
    printf '%s\n' '<head>'
    printf '%s\n' '  <meta charset="utf-8">'
    printf '%s\n' '  <script src="./support.js"></script>'
    printf '%s\n' '</head>'
    printf '%s\n' '<body>'
    printf '%s\n' '<x-dc>'
    printf '%s\n' '<helmet>'
    printf '%s\n' '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&amp;family=Caveat:wght@600;700&amp;display=swap">'
    printf '%s\n' '  <style>'
    cat _wfstyle.css
    printf '%s\n' '  </style>'
    printf '%s\n' '</helmet>'
    cat "$f"
    printf '%s\n' '</x-dc>'
    printf '%s\n' '</body>'
    printf '%s\n' '</html>'
  } > "$n.dc.html"
  echo "built $n.dc.html"
done
