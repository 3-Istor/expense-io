import { readFileSync } from 'node:fs'
import { exec } from '../lib/exec'
import policy from '../supply-chain.json'
import type { Check, CheckResult } from '../types'

interface LockPackage {
  resolved?: string
  integrity?: string
  link?: boolean
  hasInstallScript?: boolean
}

interface AuditReport {
  vulnerabilities?: Record<string, { severity: string; via: unknown[] }>
}

const SEVERITY_RANK: Record<string, number> = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }

/** Chaque paquet vient du registre officiel, en HTTPS, avec une empreinte sha512 : pas de dépendance détournée. */
export function lockfileFindings(lock: { packages?: Record<string, LockPackage> }, registry = policy.registry): string[] {
  const findings: string[] = []
  for (const [name, pkg] of Object.entries(lock.packages ?? {})) {
    if (name === '' || pkg.link) continue
    if (!pkg.resolved?.startsWith(registry)) findings.push(`${name} : source hors registre (${pkg.resolved ?? 'absente'})`)
    if (!pkg.integrity?.startsWith('sha512-')) findings.push(`${name} : empreinte sha512 absente`)
  }
  return findings
}

export const s9SupplyChain: Check = {
  id: 'S9',
  title: "Chaîne d'approvisionnement",
  risk: 'Dépendance vulnérable, détournée (registre, empreinte) ou CI exploitable (workflow GitHub mal configuré)',
  levels: ['fast', 'pr', 'nightly'],
  blocking: true,
  async run(): Promise<CheckResult> {
    const problems: string[] = []
    const notes: string[] = []
    const metrics: Record<string, number> = {}

    // 1. Lockfile : registre et empreintes (hors ligne, instantané).
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as { packages?: Record<string, LockPackage> }
    const lockProblems = lockfileFindings(lock)
    metrics.lockfileFindings = lockProblems.length
    if (lockProblems.length) problems.push(`lockfile : ${lockProblems.slice(0, 3).join(' ; ')}`)

    // 2. Vulnérabilités connues (base GitHub Advisory via npm audit) : bloquant dès « élevée », dev comprises.
    const audit = exec('npm', ['audit', '--json'], { timeoutMs: 60_000 })
    try {
      const report = JSON.parse(audit.stdout) as AuditReport
      const threshold = SEVERITY_RANK[policy.auditLevel]
      const blocking = Object.entries(report.vulnerabilities ?? {}).filter(([, v]) => SEVERITY_RANK[v.severity] >= threshold)
      metrics.vulnerableDependencies = blocking.length
      if (blocking.length) problems.push(`${blocking.length} dépendance(s) vulnérable(s) ≥ ${policy.auditLevel} : ${blocking.map(([n, v]) => `${n} (${v.severity})`).slice(0, 4).join(', ')}`)
    } catch {
      notes.push('npm audit non exécuté (registre injoignable)')
    }

    // 2 bis. Base OSV : recoupe npm audit et ajoute les paquets malveillants connus (identifiants MAL-, OpenSSF).
    const osv = exec('osv-scanner', ['scan', 'source', '--lockfile', 'package-lock.json', '--format', 'json'], { timeoutMs: 120_000 })
    if (osv.missing) {
      notes.push('osv-scanner absent (scripts/install-tools.sh)')
    } else if (osv.code === 0 || osv.code === 1) {
      try {
        const report = JSON.parse(osv.stdout) as { results?: { packages: { package: { name: string }; vulnerabilities: { id: string }[] }[] }[] }
        const hits = (report.results ?? []).flatMap((r) => r.packages).filter((p) => p.vulnerabilities.length > 0)
        const malicious = hits.filter((p) => p.vulnerabilities.some((v) => v.id.startsWith('MAL-')))
        metrics.osvPackages = hits.length
        if (malicious.length) problems.push(`PAQUET MALVEILLANT (OSV) : ${malicious.map((p) => p.package.name).join(', ')}`)
        else if (hits.length) problems.push(`${hits.length} paquet(s) vulnérable(s) selon OSV : ${hits.map((p) => p.package.name).slice(0, 4).join(', ')}`)
      } catch {
        notes.push('osv-scanner : sortie illisible')
      }
    } else {
      notes.push('base OSV injoignable')
    }

    // 3. Workflows GitHub Actions : injection, jetons trop larges, identifiants persistés (zizmor).
    const zizmor = exec('zizmor', ['--offline', '--format', 'json', '--min-severity', 'medium', '.github/workflows'])
    if (zizmor.missing) {
      notes.push('zizmor absent (pip install zizmor)')
    } else {
      try {
        const findings = JSON.parse(zizmor.stdout || '[]') as { ident: string }[]
        metrics.workflowFindings = findings.length
        if (findings.length) problems.push(`${findings.length} constat(s) zizmor sur les workflows : ${[...new Set(findings.map((f) => f.ident))].join(', ')}`)
      } catch {
        problems.push(`zizmor n'a pas produit de JSON : ${zizmor.stderr.slice(0, 150)}`)
      }
    }

    // 3 bis. La quarantaine de .npmrc n'est appliquée que par npm 11.10+ ; un npm plus ancien l'ignore en silence.
    const npmVersion = exec('npm', ['--version']).stdout.trim()
    const [major, minor] = npmVersion.split('.').map(Number)
    if (!(major > 11 || (major === 11 && minor >= 10))) notes.push(`npm ${npmVersion} n'applique pas la quarantaine (npm 11.10+ requis)`)

    // 4. Paquets à scripts d'installation : ils ne tournent pas (.npmrc ignore-scripts), on les compte pour la revue.
    metrics.packagesWithInstallScripts = Object.values(lock.packages ?? {}).filter((p) => p.hasInstallScript).length

    if (problems.length) return { status: 'fail', summary: problems.join(' — ').slice(0, 300), metrics, details: { problems, notes } }
    const suffix = notes.length ? ` (non exécuté : ${notes.join(', ')})` : ''
    return {
      status: notes.length ? 'warn' : 'pass',
      summary: `Lockfile sain, 0 vulnérabilité ≥ ${policy.auditLevel}, workflows sans constat${suffix}`,
      metrics,
    }
  },
}
