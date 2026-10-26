#!/usr/bin/env bash
# Analyse SonarQube LOCALE, sans compte et sans étape manuelle : utilisable par un humain, par l'agent avant un commit,
# et par la CI (même script). Démarre SonarQube (Docker) s'il ne répond pas, crée projet, quality gate et jeton
# jetable, lance la couverture puis l'analyse, et échoue si le quality gate échoue.
# Usage : scripts/sonar.sh            (SONAR_HOST_URL, défaut http://localhost:9000)
# Le scanner tourne dans son image Docker officielle : aucune dépendance npm (l'ancien paquet npm tirait node-forge,
# vulnérable sans correctif).
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${SONAR_HOST_URL:-http://localhost:9000}"
PROJECT=expense-io
GATE=expense-io
SCANNER_IMAGE="${SONAR_SCANNER_IMAGE:-sonarsource/sonar-scanner-cli:11}"
# Instance locale seulement : ce mot de passe ne protège rien d'autre qu'un conteneur sur la machine.
ADMIN_PASSWORD="${SONAR_ADMIN_PASSWORD:-Expense-io-local-sonar-1}"
# Mot de passe d'usine documenté d'une instance SonarQube neuve (remplacé au premier lancement ci-dessous).
FACTORY_PASSWORD=admin

status() { curl -s "$HOST/api/system/status" | sed -n 's/.*"status":"\([A-Z_]*\)".*/\1/p'; }

# Une instance qui répond déjà (même en démarrage, comme le conteneur de service en CI) : on l'attend ; sinon on la lance.
if [ -z "$(status)" ]; then
  command -v docker >/dev/null || { echo "SonarQube injoignable sur $HOST et Docker absent." >&2; exit 2; }
  docker compose --profile sonar up -d sonarqube
fi
echo "Attente de SonarQube (1 à 3 minutes au premier lancement)…"
for _ in $(seq 1 120); do [ "$(status)" = "UP" ] && break; sleep 3; done
[ "$(status)" = "UP" ] || { echo "SonarQube n'a pas démarré (statut : $(status))." >&2; exit 2; }

# Premier lancement : le compte admin/admin doit changer de mot de passe avant toute autre action.
api() { curl -sf -u "admin:$ADMIN_PASSWORD" -X POST "$HOST/api/$1" "${@:2}"; }
if ! curl -sf -u "admin:$ADMIN_PASSWORD" "$HOST/api/authentication/validate" | grep -q '"valid":true'; then
  curl -sf -u "admin:$FACTORY_PASSWORD" -X POST "$HOST/api/users/change_password" \
    --data-urlencode login=admin --data-urlencode "previousPassword=$FACTORY_PASSWORD" --data-urlencode "password=$ADMIN_PASSWORD" >/dev/null
fi

api projects/create --data-urlencode "project=$PROJECT" --data-urlencode "name=Expense.io" >/dev/null 2>&1 || true

# Quality gate maison, sur tout le code (pas seulement le « nouveau code ») : c'est ce qu'on annonce en soutenance.
if api qualitygates/create --data-urlencode "name=$GATE" >/dev/null 2>&1; then
  for condition in "bugs:0" "vulnerabilities:0" "code_smells:0" "duplicated_lines_density:5" \
                   "reliability_rating:1" "security_rating:1" "sqale_rating:1"; do
    api qualitygates/create_condition --data-urlencode "gateName=$GATE" --data-urlencode "metric=${condition%%:*}" \
      --data-urlencode op=GT --data-urlencode "error=${condition##*:}" >/dev/null
  done
fi
api qualitygates/select --data-urlencode "gateName=$GATE" --data-urlencode "projectKey=$PROJECT" >/dev/null

TOKEN_NAME="analyse-$(date +%s)"
TOKEN="$(api user_tokens/generate --data-urlencode "name=$TOKEN_NAME" --data-urlencode type=GLOBAL_ANALYSIS_TOKEN \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
trap 'api user_tokens/revoke --data-urlencode "name=$TOKEN_NAME" >/dev/null 2>&1 || true' EXIT

npm run -s test:coverage >/dev/null

# --network host : le scanner joint SonarQube sur la machine ; le jeton passe par l'environnement, jamais en argument.
docker run --rm --network host -e SONAR_HOST_URL="$HOST" -e SONAR_TOKEN="$TOKEN" \
  -v "$PWD:/usr/src" -w /usr/src "$SCANNER_IMAGE" \
  -Dsonar.qualitygate.wait=true -Dsonar.qualitygate.timeout=300

echo "Quality gate « $GATE » : OK. Détail : $HOST/dashboard?id=$PROJECT"
