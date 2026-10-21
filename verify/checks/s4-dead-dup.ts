import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import config from '../config.json'
import { exec } from '../lib/exec'
import type { Check } from '../types'

interface KnipReport {
  files?: string[]
  issues?: { file: string; exports?: unknown[]; files?: unknown[] }[]
}

function measureDeadCode(): { unusedFiles: number; unusedExports: number } | null {
  const res = exec('npx', ['knip', '--reporter', 'json', '--no-exit-code'])
  try {
    const report = JSON.parse(res.stdout) as KnipReport
    const issues = report.issues ?? []
    const unusedFiles = report.files?.length ?? issues.filter((i) => (i.files?.length ?? 0) > 0).length
    const unusedExports = issues.reduce((n, i) => n + (i.exports?.length ?? 0), 0)
    return { unusedFiles, unusedExports }
  } catch {
    return null
  }
}

function measureDuplication(): number | null {
  const out = mkdtempSync(path.join(tmpdir(), 'jscpd-'))
  exec('npx', ['jscpd', 'src', '--min-tokens', '40', '--reporters', 'json', '--output', out, '--silent'])
  try {
    const report = JSON.parse(readFileSync(path.join(out, 'jscpd-report.json'), 'utf8'))
    return Math.round(Number(report.statistics.total.percentage) * 10) / 10
  } catch {
    return null
  }
}

export const s4DeadDup: Check = {
  id: 'S4',
  title: 'Code mort et duplication',
  risk: 'Dette qui grossit, architecture de façade (code présent mais jamais utilisé)',
  levels: ['pr', 'nightly'],
  // Cliquet : bloquant si la situation empire au-delà des seuils de verify/config.json.
  blocking: true,
  async run() {
    const dead = measureDeadCode()
    const dup = measureDuplication()
    if (!dead || dup === null) return { status: 'fail', summary: 'knip ou jscpd n\'a pas produit de rapport lisible' }
    const metrics = { unusedFiles: dead.unusedFiles, unusedExports: dead.unusedExports, duplicationPercent: dup }
    const over: string[] = []
    if (dup > config.duplication.maxPercent) over.push(`duplication ${dup} % > ${config.duplication.maxPercent} %`)
    if (dead.unusedFiles > config.deadCode.maxUnusedFiles) over.push(`fichiers inutilisés ${dead.unusedFiles} > ${config.deadCode.maxUnusedFiles}`)
    if (dead.unusedExports > config.deadCode.maxUnusedExports) over.push(`exports inutilisés ${dead.unusedExports} > ${config.deadCode.maxUnusedExports}`)
    const line = `duplication ${dup} %, ${dead.unusedFiles} fichier(s) et ${dead.unusedExports} export(s) inutilisés`
    return over.length === 0
      ? { status: dead.unusedFiles + dead.unusedExports > 0 ? 'warn' : 'pass', summary: line, metrics }
      : { status: 'fail', summary: `Seuil dépassé : ${over.join(' ; ')}`, metrics }
  },
}
