import config from '../config.json'
import { exec } from '../lib/exec'
import type { Check } from '../types'

interface SemgrepOutput {
  results: { check_id: string; path: string; start: { line: number } }[]
  errors: unknown[]
}

export const s6Sast: Check = {
  id: 'S6',
  title: 'Analyse statique de sécurité',
  risk: 'Injection SQL, secret en dur, stacktrace exposée, requête hors contexte utilisateur (règles .semgrep/)',
  levels: ['pr', 'nightly'],
  // Cliquet : le nombre de constats ne peut que baisser (seuil dans verify/config.json).
  blocking: true,
  async run() {
    const res = exec('semgrep', ['scan', '--config', '.semgrep/', 'src', '--metrics=off', '--disable-version-check', '--json', '-q'], {
      timeoutMs: 300_000,
    })
    if (res.missing) return { status: 'skip', summary: "semgrep absent de cette machine : contrôle non exécuté (pip install semgrep)" }
    let out: SemgrepOutput
    try {
      out = JSON.parse(res.stdout) as SemgrepOutput
    } catch {
      return { status: 'fail', summary: `Semgrep n'a pas produit de JSON : ${res.stderr.slice(0, 200)}` }
    }
    if (out.errors.length > 0) return { status: 'fail', summary: `Erreur Semgrep (règle invalide ?) : ${JSON.stringify(out.errors[0]).slice(0, 200)}` }
    const findings = out.results.length
    const metrics = { sastFindings: findings }
    const byRule = new Map<string, number>()
    for (const r of out.results) {
      const rule = r.check_id.split('.').pop()!
      byRule.set(rule, (byRule.get(rule) ?? 0) + 1)
    }
    const detail = [...byRule].map(([rule, n]) => `${rule} ×${n}`).join(', ')
    if (findings > config.sast.maxFindings) {
      return { status: 'fail', summary: `${findings} constats > seuil ${config.sast.maxFindings} : ${detail}`, metrics, details: out.results }
    }
    return findings === 0
      ? { status: 'pass', summary: 'Aucun constat', metrics }
      : { status: 'warn', summary: `${findings} constat(s) connus (seuil ${config.sast.maxFindings}) : ${detail}`, metrics, details: out.results }
  },
}
