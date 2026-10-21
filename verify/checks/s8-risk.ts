import { exec } from '../lib/exec'
import type { Check } from '../types'

export const s8Risk: Check = {
  id: 'S8',
  title: 'Niveau de risque du changement',
  risk: "Un changement sensible (auth, isolation, contrat, CI…) qui passerait sans la relecture humaine prévue",
  levels: ['fast', 'pr', 'nightly'],
  // Informatif : il ne bloque pas, il dit à l'humain quoi relire (AGENTS.md, tableau des niveaux).
  blocking: false,
  async run() {
    const res = exec('npx', ['tsx', 'verify/risk-cli.ts', '--json'])
    let report: { level: number; checkpoint: string; files: number; reasons: { level: number; reason: string; file: string }[] }
    try {
      report = JSON.parse(res.stdout)
    } catch {
      return { status: 'skip', summary: `Niveau non calculé (base git introuvable ?) : ${res.stderr.trim().slice(0, 150)}` }
    }
    const why = [...new Set(report.reasons.filter((r) => r.level === report.level).map((r) => r.reason))].join(', ')
    const summary = `Niveau ${report.level}${why ? ` (${why})` : ''} — ${report.checkpoint}`
    return { status: report.level >= 2 ? 'warn' : 'pass', summary, metrics: { riskLevel: report.level }, details: report }
  },
}
