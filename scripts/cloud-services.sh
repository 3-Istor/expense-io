#!/usr/bin/env bash
# Démarre Postgres 16 et un S3 local SANS Docker, pour les sessions cloud où Docker Hub est inaccessible.
# Équivalent de `docker compose up` : mêmes ports (5433, 4567), même rôle `expense` superutilisateur que l'image.
# En local avec Docker, utiliser `make up` à la place.
set -euo pipefail
PGBIN=/usr/lib/postgresql/16/bin
DATA=/tmp/pgdata
if ! pg_isready -q -h localhost -p 5433; then
  if [ ! -d "$DATA" ]; then
    mkdir -p "$DATA" && chown postgres "$DATA"
    su postgres -c "$PGBIN/initdb -D $DATA -U postgres --auth=trust" > /dev/null
    FRESH=1
  fi
  su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-p 5433 -k /tmp' -l /tmp/pg.log -w start" > /dev/null
  if [ "${FRESH:-0}" = 1 ]; then
    psql -q -h localhost -p 5433 -U postgres -c "CREATE ROLE expense LOGIN SUPERUSER PASSWORD 'expense';" \
      -c "CREATE DATABASE expense_io OWNER expense;"
  fi
fi
if ! curl -s -o /dev/null http://localhost:4567/; then
  command -v moto_server > /dev/null || pip install -q 'moto[server]' --break-system-packages
  nohup moto_server -H 127.0.0.1 -p 4567 > /tmp/moto.log 2>&1 &
  for _ in $(seq 1 20); do curl -s -o /dev/null http://localhost:4567/ && break; sleep 0.5; done
fi
export DATABASE_URL=postgres://expense:expense@localhost:5433/expense_io S3_ENDPOINT=http://localhost:4567 \
  S3_ACCESS_KEY_ID=test S3_SECRET_ACCESS_KEY=test S3_REGION=us-east-1 S3_BUCKET=receipts
node scripts/migrate.mjs up > /dev/null
node scripts/ensure-bucket.mjs > /dev/null
echo "Postgres :5433 et S3 :4567 prêts, migrations appliquées."
