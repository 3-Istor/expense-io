// Contrôle des artefacts de déploiement (moulinette, S7) : Dockerfile (hadolint) et manifestes Kubernetes
// (kubernetes-validate, schémas 1.34, mode strict). Un outil absent est signalé, jamais ignoré en silence.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' })
const manifests = readdirSync('deploy/k8s').filter((f) => f.endsWith('.yaml')).map((f) => `deploy/k8s/${f}`)
const results = []

const hadolint = run('hadolint', ['Dockerfile'])
results.push(hadolint.error ? { tool: 'hadolint', status: 'absent' } : { tool: 'hadolint', status: hadolint.status === 0 ? 'ok' : 'fail', out: hadolint.stdout })

const k8s = run('kubernetes-validate', ['--strict', '--quiet', '-k', '1.34.0', ...manifests])
results.push(k8s.error ? { tool: 'kubernetes-validate', status: 'absent' } : { tool: 'kubernetes-validate', status: k8s.status === 0 ? 'ok' : 'fail', out: k8s.stdout + k8s.stderr })

console.log(JSON.stringify({ manifests: manifests.length, results }))
process.exit(results.some((r) => r.status === 'fail') ? 1 : 0)
