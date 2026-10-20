import { existsSync } from 'node:fs'
import { exec } from '../lib/exec'
import type { Check } from '../types'

const BASELINE = 'docs/audit/avant/gitleaks-baseline.json'

export const s3Secrets: Check = {
  id: 'S3',
  title: 'Secrets',
  risk: "Fuite d'un secret dans le code ou l'historique git",
  levels: ['fast', 'pr', 'nightly'],
  blocking: true,
  async run() {
    // Les secrets déjà connus (ex. SEC-02, le secret de session en dur) sont listés dans une baseline :
    // ils restent signalés dans l'audit et seront corrigés en phase 2. Tout NOUVEAU secret bloque.
    const args = ['dir', '.', '--no-banner', '--redact', '--exit-code', '1']
    if (existsSync(BASELINE)) args.push('--baseline-path', BASELINE)
    const res = exec('gitleaks', args)
    if (res.missing) {
      return {
        status: 'skip',
        summary: 'gitleaks absent de cette machine : contrôle non exécuté (la CI l\'exécute). Installer gitleaks pour l\'activer.',
      }
    }
    return res.code === 0
      ? { status: 'pass', summary: 'Aucun nouveau secret détecté' }
      : { status: 'fail', summary: `Nouveau secret détecté : ${res.stdout.split('\n').slice(0, 3).join(' ')}` }
  },
}
