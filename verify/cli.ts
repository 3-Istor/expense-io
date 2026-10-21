// La moulinette : `npm run verify -- --level fast|pr|nightly [--record]`
// Sorties : verify-report.json (détail) et verify-summary.md (≤ 20 lignes, ce que lit l'agent).
// --record ajoute une ligne à docs/metrics/history.csv (CI sur main, nuit).
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { s1TypesLint } from './checks/s1-types-lint'
import { s2Architecture } from './checks/s2-architecture'
import { s3Secrets } from './checks/s3-secrets'
import { s4DeadDup } from './checks/s4-dead-dup'
import { s5Contract } from './checks/s5-contract'
import { s6Sast } from './checks/s6-sast'
import { s7Deploy } from './checks/s7-deploy'
import { s8Risk } from './checks/s8-risk'
import type { Check, CheckResult, Level } from './types'

const CHECKS: Check[] = [s1TypesLint, s2Architecture, s3Secrets, s4DeadDup, s5Contract, s6Sast, s7Deploy, s8Risk]
const ICON: Record<CheckResult['status'], string> = { pass: 'OK', fail: 'ÉCHEC', warn: 'ATTENTION', skip: 'NON EXÉCUTÉ' }

function parseArgs(argv: string[]): { level: Level; record: boolean } {
  const i = argv.indexOf('--level')
  const level = (i >= 0 ? argv[i + 1] : 'fast') as Level
  if (!['fast', 'pr', 'nightly'].includes(level)) {
    console.error(`Niveau inconnu : ${level}. Attendu : fast, pr ou nightly.`)
    process.exit(2)
  }
  return { level, record: argv.includes('--record') }
}

async function main() {
  const { level, record } = parseArgs(process.argv.slice(2))
  const selected = CHECKS.filter((c) => c.levels.includes(level))
  const startedAt = new Date()
  const results: (CheckResult & Pick<Check, 'id' | 'title' | 'risk' | 'blocking'> & { durationMs: number })[] = []

  for (const check of selected) {
    const t0 = Date.now()
    let result: CheckResult
    try {
      result = await check.run()
    } catch (error) {
      result = { status: 'fail', summary: `Le contrôle a planté : ${(error as Error).message}` }
    }
    results.push({ ...result, id: check.id, title: check.title, risk: check.risk, blocking: check.blocking, durationMs: Date.now() - t0 })
  }

  const blockingFailures = results.filter((r) => r.status === 'fail' && r.blocking)
  const verdict = blockingFailures.length === 0 ? 'VERT' : 'ROUGE'
  const metrics = Object.assign({}, ...results.map((r) => r.metrics ?? {})) as Record<string, number>

  writeFileSync('verify-report.json', JSON.stringify({ level, verdict, startedAt, results, metrics }, null, 2))

  const lines = [
    `# Moulinette — niveau ${level} — ${verdict}`,
    '',
    ...results.map(
      (r) => `- ${r.id} ${r.title} : ${ICON[r.status]}${r.blocking ? '' : ' (non bloquant)'} — ${r.summary.replace(/\n/g, ' ').slice(0, 220)}`,
    ),
    '',
    blockingFailures.length > 0
      ? `À corriger : ${blockingFailures.map((r) => r.id).join(', ')}. Détail dans verify-report.json.`
      : 'Aucun contrôle bloquant en échec.',
  ]
  writeFileSync('verify-summary.md', lines.slice(0, 20).join('\n') + '\n')
  console.log(lines.join('\n'))

  if (record) {
    const file = 'docs/metrics/history.csv'
    mkdirSync('docs/metrics', { recursive: true })
    const keys = ['date', 'level', 'verdict', 'architectureViolations', 'unusedFiles', 'unusedExports', 'duplicationPercent']
    if (!existsSync(file)) appendFileSync(file, keys.join(',') + '\n')
    const row = [startedAt.toISOString(), level, verdict, ...keys.slice(3).map((k) => metrics[k] ?? '')]
    appendFileSync(file, row.join(',') + '\n')
  }

  process.exit(verdict === 'VERT' ? 0 : 1)
}

void main()
