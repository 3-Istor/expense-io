import { exec } from '../lib/exec'
import type { Check } from '../types'

interface DeployReport {
  manifests: number
  results: { tool: string; status: 'ok' | 'fail' | 'absent'; out?: string }[]
}

export const s7Deploy: Check = {
  id: 'S7',
  title: 'Artefacts de déploiement',
  risk: 'Image ou manifestes Kubernetes invalides découverts au déploiement plutôt qu\'à la PR',
  levels: ['pr', 'nightly'],
  blocking: true,
  async run() {
    const res = exec('node', ['scripts/check-deploy.mjs'])
    let report: DeployReport
    try {
      report = JSON.parse(res.stdout) as DeployReport
    } catch {
      return { status: 'fail', summary: `scripts/check-deploy.mjs n'a pas produit de JSON : ${res.stderr.slice(0, 200)}` }
    }
    const failed = report.results.filter((r) => r.status === 'fail')
    const absent = report.results.filter((r) => r.status === 'absent').map((r) => r.tool)
    if (failed.length > 0) {
      return { status: 'fail', summary: failed.map((r) => `${r.tool} : ${(r.out ?? '').trim().split('\n')[0]}`).join(' ; ').slice(0, 300), details: failed }
    }
    if (absent.length === report.results.length) return { status: 'skip', summary: `Outils absents : ${absent.join(', ')}` }
    const note = absent.length ? ` (non exécuté : ${absent.join(', ')})` : ''
    return { status: absent.length ? 'warn' : 'pass', summary: `Dockerfile et ${report.manifests} manifestes valides${note}` }
  },
}
