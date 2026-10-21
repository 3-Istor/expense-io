import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exec } from '../lib/exec'
import type { Check } from '../types'

const BASELINE = 'docs/audit/avant/gitleaks-baseline.json'

/** Copie les fichiers du dépôt (suivis + nouveaux non ignorés) : gitleaks ne lit ni node_modules ni .next. */
function snapshotRepoFiles(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'gitleaks-'))
  const files = exec('git', ['ls-files', '--cached', '--others', '--exclude-standard']).stdout.split('\n').filter(Boolean)
  for (const file of files) {
    if (!existsSync(file) || /(^|\/)\.env(\.|$)/.test(file)) continue // .env* : jamais lu (AGENTS.md)
    mkdirSync(path.join(dir, path.dirname(file)), { recursive: true })
    cpSync(file, path.join(dir, file))
  }
  return dir
}

export const s3Secrets: Check = {
  id: 'S3',
  title: 'Secrets',
  risk: "Fuite d'un secret dans le code",
  levels: ['fast', 'pr', 'nightly'],
  blocking: true,
  async run() {
    if (exec('gitleaks', ['version']).missing) {
      return {
        status: 'skip',
        summary: "gitleaks absent de cette machine : contrôle non exécuté (la CI l'exécute). Installer gitleaks pour l'activer.",
      }
    }
    // Aucun constat n'est masqué par l'agent : un secret connu (SEC-02) fait échouer ce contrôle jusqu'à son
    // correctif, sauf baseline validée par un humain (docs/security/false-positives.md).
    const dir = snapshotRepoFiles()
    const args = ['dir', dir, '--no-banner', '--redact', '--exit-code', '1']
    if (existsSync(BASELINE)) args.push('--baseline-path', BASELINE)
    const res = exec('gitleaks', args)
    rmSync(dir, { recursive: true, force: true })
    const out = `${res.stdout}\n${res.stderr}`.replaceAll(dir + '/', '')
    return res.code === 0
      ? { status: 'pass', summary: 'Aucun secret détecté dans les fichiers du dépôt' }
      : { status: 'fail', summary: `Secret détecté : ${out.split('\n').filter((l) => /File|RuleID|Line|leaks found/.test(l)).slice(0, 4).join(' · ')}` }
  },
}
