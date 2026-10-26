import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import { changeKind, checkChangelog, checkVersion, type OasdiffChange } from '../lib/contract-version'
import { exec } from '../lib/exec'
import type { Check, CheckResult } from '../types'

const SPEC = 'docs/openapi.yaml'
const CHANGELOG = 'docs/contract-changelog.md'

/**
 * Compatibilité avec la base (merge-base avec origin/main, ou RISK_BASE) : oasdiff classe le changement, la version
 * et le changelog doivent suivre. Sans base disponible : « non exécuté », jamais une comparaison du fichier à lui-même.
 */
function compatibility(): { ok: boolean; skipped?: string; summary: string; details?: unknown } {
  if (exec('oasdiff', ['--version']).missing) return { ok: true, skipped: 'oasdiff absent (scripts/install-tools.sh)', summary: '' }
  const base = process.env.RISK_BASE || 'origin/main'
  const mergeBase = exec('git', ['merge-base', base, 'HEAD'])
  if (mergeBase.code !== 0) return { ok: true, skipped: `base ${base} introuvable`, summary: '' }
  const baseSpec = exec('git', ['show', `${mergeBase.stdout.trim()}:${SPEC}`])
  if (baseSpec.code !== 0) return { ok: true, skipped: 'pas de contrat dans la base', summary: '' }
  const dir = mkdtempSync(path.join(tmpdir(), 'contract-'))
  try {
    const basePath = path.join(dir, 'base.yaml')
    writeFileSync(basePath, baseSpec.stdout)
    const changelog = exec('oasdiff', ['changelog', basePath, SPEC, '--format', 'json'])
    if (changelog.code !== 0) return { ok: false, summary: `oasdiff a échoué : ${changelog.stderr.slice(0, 200)}` }
    const changes = JSON.parse(changelog.stdout || '[]') as OasdiffChange[]
    const structural = exec('oasdiff', ['diff', basePath, SPEC, '--format', 'json']).stdout.trim()
    const differ = structural !== '' && structural !== '{}'
    const kind = changeKind(changes, differ)
    const before = String((parse(baseSpec.stdout) as { info: { version: string } }).info.version)
    const after = String((parse(readFileSync(SPEC, 'utf8')) as { info: { version: string } }).info.version)
    const version = checkVersion(before, after, kind)
    if (!version.ok) return { ok: false, summary: version.reason, details: changes }
    if (before !== after) {
      const adrStatus = (id: string) => {
        const file = readdirSync('docs/adr').find((f) => f.startsWith(`${id}-`))
        return file ? readFileSync(path.join('docs/adr', file), 'utf8').split('\n').find((l) => /statut/i.test(l)) : undefined
      }
      const log = checkChangelog(existsSync(CHANGELOG) ? readFileSync(CHANGELOG, 'utf8') : '', after, kind, adrStatus)
      if (!log.ok) return { ok: false, summary: log.reason, details: changes }
    }
    const ruptures = changes.filter((c) => c.level >= 2).map((c) => c.text)
    const note = ruptures.length ? ` ; ruptures : ${ruptures.slice(0, 2).join(' ; ')}` : ''
    return { ok: true, summary: `${version.reason}${note}`, details: { kind, before, after, changes } }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

interface SpectralFinding {
  code: string
  severity: number // 0 erreur, 1 avertissement
}

export const s5Contract: Check = {
  id: 'S5',
  title: 'Contrat OpenAPI',
  risk: "Spec pas à jour avec le code, invalide, hors conventions, ou contrat cassé sans version majeure, ADR et changelog",
  levels: ['fast', 'pr', 'nightly'],
  // Redocly (validité de la spec) bloque ; les règles maison Spectral avertissent jusqu'à la phase 3.
  blocking: true,
  async run(): Promise<CheckResult> {
    // Le contrat vit dans le code (ADR 0001) : l'OpenAPI commité doit être exactement celui généré par src/contract.
    const drift = exec('npx', ['tsx', 'scripts/generate-openapi.ts', '--check'])
    if (drift.code !== 0) {
      return { status: 'fail', summary: `${drift.stderr.trim() || drift.stdout.trim()}`.slice(0, 300) }
    }
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
    // Semver du contrat contre la base : rupture → majeure + ADR, ajout → mineure, texte → patch, avec changelog.
    const compat = compatibility()
    if (!compat.ok) return { status: 'fail', summary: `Version du contrat : ${compat.summary}`.slice(0, 300), metrics, details: compat.details }
    const codes = [...new Set(findings.map((f) => f.code))].join(', ')
    if (errors.length > 0) return { status: 'fail', summary: `${errors.length} erreur(s) Spectral : ${codes}`, metrics, details: findings }
    if (warnings.length > 0) {
      return { status: 'warn', summary: `Spec valide ; ${warnings.length} avertissement(s) maison : ${codes}`, metrics, details: findings }
    }
    if (compat.skipped) return { status: 'warn', summary: `Spec valide ; compatibilité non vérifiée : ${compat.skipped}`, metrics }
    return { status: 'pass', summary: `Spec valide, règles maison respectées ; ${compat.summary}`, metrics }
  },
}
