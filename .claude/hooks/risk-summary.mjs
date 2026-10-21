#!/usr/bin/env node
// Hook Stop : à la fin de chaque tour de l'agent, affiche le niveau de risque du changement en cours et le point de
// contrôle humain associé (verify/risk.ts). Purement informatif : ne bloque jamais.
import { spawnSync } from 'node:child_process'

const risk = spawnSync('npx', ['tsx', 'verify/risk-cli.ts'], { encoding: 'utf8', timeout: 60_000 })
if (risk.status === 0 && risk.stdout.trim()) console.log(risk.stdout.trim().split('\n').slice(0, 4).join('\n'))
process.exit(0)
