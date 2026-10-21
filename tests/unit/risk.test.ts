import { describe, expect, it } from 'vitest'
import { classify, type ChangedFile } from '../../verify/risk'

const m = (path: string, added: string[] = []): ChangedFile => ({ path, status: 'M', added })
const level = (...files: ChangedFile[]) => classify(files).level

describe('niveau de risque (AGENTS.md)', () => {
  it('0 : documentation et style', () => {
    expect(level(m('docs/slo.md'), m('src/app/globals.css'))).toBe(0)
    expect(level()).toBe(0)
  })
  it('1 : code d\'un module, tests', () => {
    expect(level(m('src/modules/expense-notes/application/use-cases.ts'))).toBe(1)
    expect(level(m('tests/unit/smoke.test.ts'))).toBe(1)
    expect(level(m('un-fichier-inconnu.xyz'))).toBe(1) // inconnu : jamais en dessous de 1
  })
  it('2 : contrat, nouvel endpoint, migration, dépendances, plusieurs modules', () => {
    expect(level(m('src/contract/operations.ts'))).toBe(2)
    expect(level({ path: 'src/app/api/finance/route.ts', status: 'A' })).toBe(2)
    expect(level(m('src/app/api/expense-notes/route.ts'))).toBe(1) // route existante modifiée
    expect(level(m('migrations/1700000000005_x.sql', ['ALTER TABLE expense_notes ADD COLUMN x int;']))).toBe(2)
    expect(level(m('package.json'))).toBe(2)
    expect(level(m('src/modules/expense-notes/index.ts'), m('src/modules/identity/index.ts'))).toBe(2)
  })
  it('3 : authentification, isolation, accès, RLS, secrets, CI, moulinette, harnais', () => {
    for (const p of ['src/lib/auth.ts', 'src/lib/db.ts', 'src/modules/identity/session.ts', '.github/workflows/ci.yml',
      'verify/config.json', '.semgrep/expense-io.yml', '.claude/settings.json', 'AGENTS.md', '.env.example',
      'src/modules/expense-notes/infrastructure/pg-expense-note-repository.ts']) {
      expect(level(m(p)), p).toBe(3)
    }
    expect(level(m('migrations/1700000000005_x.sql', ['CREATE POLICY p ON expense_notes USING (true);']))).toBe(3)
  })
  it('3 : un test supprimé ou affaibli', () => {
    expect(level({ path: 'tests/api/authz.spec.ts', status: 'D' })).toBe(3)
    expect(level(m('tests/api/authz.spec.ts', ["  test.skip('T11', async () => {"]))).toBe(3)
    expect(level(m('tests/api/authz.spec.ts', ["  knownFlaw('SEC-03', 'raison')"]))).toBe(3)
  })
  it('ne se trompe pas sur un mot-clé simplement cité', () => {
    expect(level(m('src/modules/x/domain/y.ts', ['// GRANT et POLICY ne sont que cités']))).toBe(1)
    expect(level(m('tests/unit/a.test.ts', ["    expect(f(\"test.skip('x')\")).toBe(1)"]))).toBe(1)
  })
  it('le plus élevé l\'emporte, avec le point de contrôle associé', () => {
    const report = classify([m('docs/slo.md'), m('src/lib/auth.ts')])
    expect(report.level).toBe(3)
    expect(report.checkpoint).toMatch(/valide le plan/)
    expect(report.reasons[0]).toMatchObject({ level: 3, file: 'src/lib/auth.ts' })
  })
})
