#!/usr/bin/env bash
# En CI : lance une commande et, si elle échoue, publie ses dernières lignes en annotation GitHub.
# Les annotations sont lisibles dans la PR et par l'API, y compris par un agent qui n'a pas accès aux journaux bruts.
# Usage : scripts/ci-run.sh <titre> <commande> [arguments…]
set -uo pipefail
title="$1"; shift
log="$(mktemp)"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  # Une annotation par ligne utile (25 dernières), sans codes de couleur.
  tail -25 "$log" | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | while IFS= read -r line; do
    echo "::error title=${title}::${line:0:300}"
  done
fi
exit "$status"
