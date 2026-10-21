#!/usr/bin/env bash
# Couverture RÉELLE du code serveur par les tests d'API (Playwright) : build de production webpack avec source maps
# serveur, `next start` instrumenté par la couverture native de Node (NODE_V8_COVERAGE), toute la suite d'API, puis
# monocart-coverage-reports ramène la couverture aux fichiers de src/. Rapport : coverage/api (lcov + texte).
# Prérequis : Postgres et S3 de test démarrés (make up, ou scripts/cloud-services.sh), migrations appliquées.
set -euo pipefail
PORT=${PORT:-3300}
COV_DIR=$(mktemp -d)

COVERAGE_BUILD=1 npx next build --webpack > /dev/null
export DATABASE_URL=${DATABASE_URL:-postgres://expense_app_login:expense_app@localhost:5433/expense_io}
NODE_V8_COVERAGE=$COV_DIR NODE_ENV=production AUTH_TRUST_HOST=true \
  S3_ENDPOINT=${S3_ENDPOINT:-http://localhost:4567} S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID:-test} \
  S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY:-test} S3_BUCKET=${S3_BUCKET:-receipts} \
  node node_modules/next/dist/bin/next start -p "$PORT" > /tmp/coverage-api-server.log 2>&1 &
SERVER=$!
trap 'kill -INT $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$PORT/login" && break; sleep 1; done

API_BASE_URL="http://localhost:$PORT" npx playwright test || STATUS=$?

# Arrêt propre (SIGINT) : Node n'écrit sa couverture qu'à une sortie normale.
kill -INT $SERVER; wait $SERVER 2>/dev/null || true
trap - EXIT
# monocart-coverage-reports : lit la couverture V8 brute et la ramène aux sources via les source maps des bundles.
node scripts/coverage-report.mjs "$COV_DIR"
[ -n "${KEEP_RAW:-}" ] && cp -r "$COV_DIR" /tmp/coverage-api-raw
rm -rf "$COV_DIR" .next  # le build instrumenté n'est pas réutilisé
exit ${STATUS:-0}
