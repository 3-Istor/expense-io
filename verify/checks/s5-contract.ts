import { exec } from '../lib/exec'
import type { Check } from '../types'

interface SpectralFinding {
  code: string
  severity: number // 0 erreur, 1 avertissement
}

export const s5Contract: Check = {
  id: 'S5',
  title: 'Contrat OpenAPI',
  risk: 'Spec invalide ou qui dérive des conventions du contrat (format d\'erreur, champs, stacktrace exposée)',
  levels: ['fast', 'pr', 'nightly'],
  // Redocly (validité de la spec) bloque ; les règles maison Spectral avertissent jusqu'à la phase 3.
  blocking: true,
  async run() {
    const redocly = exec('npx', ['redocly', 'lint', '--format', 'summary'])
    if (redocly.code !== 0) {
      return { status: 'fail', summary: `docs/openapi.yaml invalide (redocly lint) : ${redocly.stdout.slice(-200)}` }
    }
    const spectral = exec('npx', ['spectral', 'lint', 'docs/openapi.yaml', '--format', 'json', '--quiet'])
    let findings: SpectralFinding[]
    try {
      findings = JSON.parse(spectral.stdout || '[]') as SpectralFinding[]
    } catch {
      return { status: 'fail', summary: `Spectral n'a pas produit de JSON : ${spectral.stderr.slice(0, 200)}` }
    }
    const errors = findings.filter((f) => f.severity === 0)
    const warnings = findings.filter((f) => f.severity === 1)
    const metrics = { contractWarnings: warnings.length }
    const codes = [...new Set(findings.map((f) => f.code))].join(', ')
    if (errors.length > 0) return { status: 'fail', summary: `${errors.length} erreur(s) Spectral : ${codes}`, metrics, details: findings }
    if (warnings.length > 0) {
      return { status: 'warn', summary: `Spec valide ; ${warnings.length} avertissement(s) maison : ${codes}`, metrics, details: findings }
    }
    return { status: 'pass', summary: 'Spec valide, aucune règle maison enfreinte', metrics }
  },
}
