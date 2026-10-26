#!/usr/bin/env bash
# Range la preuve d'un ticket dans docs/evidence/<ticket>/ : verdict de la moulinette, niveau de risque, tests, commit.
# Une preuve est une sortie de commande datée, jamais une affirmation (« c'est vert »).
# Usage : scripts/evidence.sh T-NNNN [--with-api]   (après `npm run verify -- --level pr`)
set -euo pipefail
cd "$(dirname "$0")/.."

ticket="${1:?Usage : scripts/evidence.sh T-NNNN [--with-api]}"
[[ "$ticket" =~ ^T-[0-9]{4}$ ]] || { echo "Identifiant attendu : T-NNNN" >&2; exit 2; }
ls docs/tickets/"$ticket"-*.md >/dev/null 2>&1 || { echo "Ticket $ticket introuvable dans docs/tickets/" >&2; exit 2; }
[ -f verify-summary.md ] || { echo "Lancer d'abord : npm run verify -- --level pr" >&2; exit 2; }

dir="docs/evidence/$ticket"
mkdir -p "$dir"
sha="$(git rev-parse --short HEAD)"
out="$dir/$(date +%Y-%m-%d)-$sha.md"
strip() { sed 's/\x1b\[[0-9;]*m//g'; }

{
  echo "# Preuve $ticket — $(date '+%Y-%m-%d %H:%M') — commit $sha"
  echo
  echo "Branche : \`$(git branch --show-current)\` · modifications non commitées : $(git status --porcelain | wc -l)"
  echo
  echo "## Moulinette"
  echo
  cat verify-summary.md
  echo
  echo "## Niveau de risque"
  echo
  echo '```'
  npx tsx verify/risk-cli.ts 2>&1 | strip
  echo '```'
  echo
  echo "## Tests unitaires"
  echo
  echo '```'
  npm test 2>&1 | strip | grep -E "Test Files|Tests " || true
  echo '```'
  if [ "${2:-}" = "--with-api" ]; then
    echo
    echo "## Tests d'API"
    echo
    echo '```'
    npm run -s test:api 2>&1 | strip | tail -3
    echo '```'
  fi
} > "$out"

echo "Preuve rangée : $out"
