// Environnement des tests d'API : valeurs de développement local, publiques (mêmes identifiants que
// docker-compose.yml), jamais des secrets. Chaque variable peut être surchargée par l'environnement (CI).
export const TEST_ENV = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://expense:expense@localhost:5433/expense_io',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:4567',
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET ?? 'receipts',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? 'test',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? 'test',
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? 'true',
}
