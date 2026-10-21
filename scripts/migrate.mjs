// Lance node-pg-migrate avec le compte ADMINISTRATEUR (DATABASE_ADMIN_URL) : l'application, elle, se connecte avec un
// compte limité (DATABASE_URL, SEC-05). Sans DATABASE_ADMIN_URL (ancien .env), DATABASE_URL est utilisé : rien ne casse.
// Usage : node scripts/migrate.mjs up|down [options de node-pg-migrate]
import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'

loadEnv({ quiet: true })
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL }
const result = spawnSync('npx', ['node-pg-migrate', ...process.argv.slice(2)], { stdio: 'inherit', env })
process.exit(result.status ?? 1)
