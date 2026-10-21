import { randomBytes } from 'node:crypto'

// Environnement des tests d'API : valeurs de développement local, publiques (mêmes identifiants que
// docker-compose.yml), jamais des secrets. Chaque variable peut être surchargée par l'environnement (CI).
export const TEST_ENV = {
  // L'app se connecte avec le compte limité (SEC-05) ; les fixtures écrivent avec le compte administrateur.
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://expense_app_login:expense_app@localhost:5433/expense_io',
  DATABASE_ADMIN_URL: process.env.DATABASE_ADMIN_URL ?? 'postgres://expense:expense@localhost:5433/expense_io',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:4567',
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET ?? 'receipts',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? 'test',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? 'test',
  // Secret de session propre à chaque exécution des tests (SEC-02) : aucun secret n'est écrit dans le dépôt.
  AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString('hex'),
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? 'true',
}
