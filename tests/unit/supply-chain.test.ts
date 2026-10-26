// Le harnais et Renovate doivent dire la même chose : un paquet critique pour l'un l'est pour l'autre.
// Sinon un patch de next-auth pourrait être fusionné automatiquement par Renovate alors que la moulinette le classe en
// niveau 3 (relecture humaine). Voir docs/security/supply-chain.md.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lockfileFindings } from '../../verify/checks/s9-supply-chain'
import policy from '../../verify/supply-chain.json'

interface Rule {
  matchPackageNames?: string[]
  matchDepTypes?: string[]
  matchUpdateTypes?: string[]
  automerge?: boolean
}
const renovate = JSON.parse(readFileSync('renovate.json', 'utf8')) as { packageRules: Rule[]; minimumReleaseAge: string }
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> }

describe('politique des dépendances', () => {
  it('Renovate ne fusionne jamais seul un paquet critique, et la règle vient après les règles automatiques', () => {
    const rules = renovate.packageRules
    const criticalIndex = rules.findIndex(
      (r) => r.automerge === false && JSON.stringify([...(r.matchPackageNames ?? [])].sort()) === JSON.stringify([...policy.critical].sort()),
    )
    expect(criticalIndex, 'règle Renovate des paquets critiques absente ou différente de verify/supply-chain.json').toBeGreaterThan(-1)
    const lastAutomerge = rules.map((r) => r.automerge === true).lastIndexOf(true)
    expect(criticalIndex).toBeGreaterThan(lastAutomerge)
  })

  it('le délai de quarantaine est le même partout', () => {
    expect(renovate.minimumReleaseAge).toBe(`${policy.minimumReleaseAgeDays} days`)
    expect(readFileSync('.npmrc', 'utf8')).toMatch(new RegExp(`^min-release-age=${policy.minimumReleaseAgeDays}$`, 'm'))
  })

  it('les scripts d\'installation des paquets sont coupés', () => {
    expect(readFileSync('.npmrc', 'utf8')).toMatch(/^ignore-scripts=true$/m)
  })

  it('chaque paquet critique est une vraie dépendance d\'exécution, avec sa raison', () => {
    for (const name of policy.critical) {
      expect(pkg.dependencies, name).toHaveProperty([name])
      expect((policy.criticalWhy as Record<string, string>)[name], name).toBeTruthy()
    }
  })

  it('S9 refuse un paquet hors registre ou sans empreinte sha512', () => {
    const ok = { resolved: 'https://registry.npmjs.org/a/-/a-1.0.0.tgz', integrity: 'sha512-abc' }
    expect(lockfileFindings({ packages: { '': {}, 'node_modules/a': ok } })).toEqual([])
    expect(lockfileFindings({ packages: { 'node_modules/b': { ...ok, resolved: 'https://evil.example/b.tgz' } } })).toHaveLength(1)
    expect(lockfileFindings({ packages: { 'node_modules/c': { ...ok, integrity: 'sha1-abc' } } })).toHaveLength(1)
    expect(lockfileFindings({ packages: { 'node_modules/d': { resolved: 'git+ssh://github.com/x/d.git' } } })).toHaveLength(2)
  })
})
