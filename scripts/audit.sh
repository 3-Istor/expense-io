#!/usr/bin/env bash
# Audit outillé et reproductible : lance chaque outil sur src/, archive sa sortie brute, sa commande et sa version.
# Usage : scripts/audit.sh docs/audit/avant   (puis docs/audit/apres après la phase 3)
# Un outil absent est noté « non exécuté » au lieu d'être ignoré en silence.
set -uo pipefail
OUT="${1:?usage: scripts/audit.sh <dossier de sortie>}"
RAW="$OUT/raw"
mkdir -p "$RAW"
LOG="$RAW/commands.txt"
: > "$LOG"
echo "# Audit du $(date -u +%Y-%m-%dT%H:%MZ), commit $(git rev-parse --short HEAD), src identique à : $(git log -1 --format=%h -- src)" >> "$LOG"

run() { # run <nom> <fichier de sortie> <commande...>
  local name="$1" file="$2"; shift 2
  if ! command -v "$1" >/dev/null 2>&1 && [ "$1" != npx ] && [ "$1" != npm ]; then
    echo "$name : NON EXÉCUTÉ (outil absent de la machine)" | tee -a "$LOG"
    return
  fi
  echo "\$ $*" >> "$LOG"
  "$@" > "$RAW/$file" 2>> "$RAW/stderr.txt"
  echo "  → code de sortie $?, sortie dans raw/$file" >> "$LOG"
}

{
  echo "## Versions"
  echo "node $(node --version)"
  echo "jscpd $(npx jscpd --version 2>/dev/null)"
  echo "knip $(npx knip --version 2>/dev/null)"
  echo "semgrep $(semgrep --version 2>/dev/null || echo absent)"
  echo "gitleaks $(gitleaks version 2>/dev/null || echo absent)"
  echo "osv-scanner $(osv-scanner --version 2>/dev/null | head -1 || echo absent)"
  echo "npm $(npm --version)"
} >> "$LOG"

TMP=$(mktemp -d)
run jscpd jscpd-summary.txt npx jscpd src --min-tokens 40 --reporters json,consoleFull --output "$TMP" --silent
cp "$TMP/jscpd-report.json" "$RAW/jscpd.json" 2>/dev/null
run knip knip.json npx knip --reporter json --no-exit-code
run semgrep semgrep.json semgrep scan --config .semgrep/ src --metrics=off --disable-version-check --json -q
run gitleaks gitleaks.json gitleaks dir . --no-banner --redact --report-format json --report-path /dev/stdout --exit-code 0
run osv-scanner osv.json osv-scanner scan source --lockfile package-lock.json --format json
run "npm audit" npm-audit.json npm audit --json --omit=dev
echo "Terminé : $LOG"
