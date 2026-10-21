#!/usr/bin/env bash
# Fuzzing du contrat avec Schemathesis : des milliers de requêtes générées depuis docs/openapi.yaml (valeurs limites,
# types faux, méthodes non déclarées), un passage par rôle pour atteindre les routes de chacun.
# Échec si une réponse est un 500, ou si un code ou un schéma de réponse sort du contrat.
# Prérequis : l'app tourne (make dev ou npm start) avec les données de démo ; pip install schemathesis.
# Usage : npm run test:fuzz [-- <nombre d'exemples par opération>]   (BASE_URL, défaut http://localhost:3000)
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:3000}"
EXAMPLES="${1:-50}"
command -v schemathesis >/dev/null || { echo "schemathesis absent : pip install schemathesis" >&2; exit 2; }
mkdir -p reports/fuzz

# Comptes de démo (scripts de seed, valeurs publiques de développement).
ROLES=(
  "employe demo@expense.io demo1234"
  "manager manager@expense.io manager1234"
  "rh hr@expense.io hr1234"
)

status=0
for entry in "${ROLES[@]}"; do
  read -r role email password <<<"$entry"
  cookie="$(node scripts/session-cookie.mjs "$BASE_URL" "$email" "$password")"
  echo "== Fuzzing en tant que $role ($email)"
  SESSION_TOKEN="${cookie#authjs.session-token=}" schemathesis run docs/openapi.yaml \
    --url "$BASE_URL" \
    --max-examples "$EXAMPLES" \
    --seed 1 \
    --report junit --report-dir "reports/fuzz/$role" \
    || status=1
done
exit $status
