import { exec } from '../lib/exec'
import type { Check } from '../types'

interface DepcruiseOutput {
  summary: { error: number; warn: number; violations: { rule: { name: string }; from: string; to: string }[] }
}

export const s2Architecture: Check = {
  id: 'S2',
  title: "Règles d'architecture",
  risk: "Dérive : le domaine qui dépend de l'infrastructure, des cycles entre modules",
  levels: ['fast', 'pr', 'nightly'],
  // Bloquant depuis la phase 3 (tâche 3.4) : l'architecture cible est en place, toute régression arrête la PR.
  blocking: true,
  async run() {
    const res = exec('npx', ['depcruise', 'src', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'])
    let output: DepcruiseOutput
    try {
      output = JSON.parse(res.stdout) as DepcruiseOutput
    } catch {
      return { status: 'fail', summary: `dependency-cruiser n'a pas produit de JSON : ${res.stderr.slice(0, 200)}` }
    }
    const { error, warn, violations } = output.summary
    const metrics = { architectureViolations: error + warn }
    if (error + warn === 0) return { status: 'pass', summary: 'Aucune violation des règles de dépendance', metrics }
    const first = violations.slice(0, 3).map((v) => `${v.rule.name} : ${v.from} → ${v.to}`)
    return {
      status: error > 0 ? 'fail' : 'warn',
      summary: `${error} erreur(s), ${warn} avertissement(s). Ex. : ${first.join(' ; ')}`,
      metrics,
      details: violations,
    }
  },
}
