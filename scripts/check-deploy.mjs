// Contrôle de l'artefact de déploiement (moulinette, S7) : le Dockerfile, analysé par hadolint.
// Outil absent : signalé, jamais ignoré en silence.
import { spawnSync } from 'node:child_process'

const hadolint = spawnSync('hadolint', ['Dockerfile'], { encoding: 'utf8' })
const results = [
  hadolint.error
    ? { tool: 'hadolint', status: 'absent' }
    : { tool: 'hadolint', status: hadolint.status === 0 ? 'ok' : 'fail', out: hadolint.stdout },
]
console.log(JSON.stringify({ results }))
process.exit(results.some((r) => r.status === 'fail') ? 1 : 0)
