// Lance node-pg-migrate avec le compte ADMINISTRATEUR (DATABASE_ADMIN_URL) : l'application, elle, se connecte avec un
// compte limité (DATABASE_URL, SEC-05). Sans DATABASE_ADMIN_URL (ancien .env), DATABASE_URL est utilisé : rien ne casse.
// Usage : node scripts/migrate.mjs up|down [options de node-pg-migrate]
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ quiet: true })
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL }
// Binaire appelé directement (pas npx) : marche aussi en conteneur à système de fichiers en lecture seule.
const require = createRequire(import.meta.url)
const bin = path.join(path.dirname(require.resolve('node-pg-migrate/package.json')), 'bin/node-pg-migrate.js')
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: 'inherit', env })
process.exit(result.status ?? 1)
