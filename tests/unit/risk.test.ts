import { describe, expect, it } from 'vitest'
import { classify, newFileLines, type ChangedFile } from '../../verify/risk'

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
    expect(level(m('package-lock.json'))).toBe(2) // lockfile seul : on ne voit pas ce qui change
    expect(level(m('src/modules/expense-notes/index.ts'), m('src/modules/identity/index.ts'))).toBe(2)
  })
  it('3 : authentification, isolation, accès, RLS, secrets, CI, moulinette, harnais', () => {
    for (const p of ['src/lib/auth.ts', 'src/lib/db.ts', 'src/modules/identity/session.ts', '.github/workflows/ci.yml',
      'verify/config.json', '.semgrep/expense-io.yml', '.claude/settings.json', 'AGENTS.md', '.env.example',
      'src/modules/expense-notes/domain/approvers.ts']) {
      expect(level(m(p)), p).toBe(3)
    }
    const repo = 'src/modules/expense-notes/infrastructure/pg-expense-note-repository.ts'
    expect(level(m(repo, ['  hr: `SELECT … WHERE ${SCOPE.hr}`,']))).toBe(3) // périmètre touché
    expect(level(m(repo, ['        [caller.userId, note.category],']))).toBe(1) // simple colonne
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

  describe('dépendances : semver ne suffit pas, la criticité compte', () => {
    const pkg = (...lines: string[]) => m('package.json', lines)
    const ctx = { devDependencies: ['vitest', '@stryker-mutator/core'] }
    it('3 : un simple patch d\'un paquet critique', () => {
      expect(classify([pkg('    "next-auth": "^5.0.0-beta.33",')], ctx).level).toBe(3)
      expect(classify([pkg('    "next": "16.4.3",')], ctx).level).toBe(3)
      expect(classify([pkg('    "pg": "^8.23.1",')], ctx).level).toBe(3)
    })
    it('2 : une dépendance d\'exécution ordinaire', () => {
      expect(classify([pkg('    "geist": "^1.8.2",')], ctx).level).toBe(2)
    })
    it('1 : un outil de dev seulement, même en version majeure', () => {
      expect(classify([pkg('    "vitest": "^5.0.5",')], ctx).level).toBe(1)
    })
    it('2 : une ligne de package.json qui n\'est pas une dépendance, ou un retrait', () => {
      expect(classify([pkg('  "overrides": {')], ctx).level).toBe(2)
      expect(classify([pkg()], ctx).level).toBe(2)
    })
    it('3 : la politique des dépendances elle-même', () => {
      for (const p of ['renovate.json', '.npmrc', '.github/CODEOWNERS', 'verify/supply-chain.json', '.githooks/pre-commit']) {
        expect(level(m(p)), p).toBe(3)
      }
    })
  })
})

describe('fichiers pas encore suivis par git (T-0026, répétition 4)', () => {
  const file = (content: Buffer, isFile = true) => ({ stat: () => ({ isFile: () => isFile, size: content.length }), read: () => content })
  it('le contenu d’une migration non suivie déclenche la règle RLS', () => {
    const sql = 'CREATE POLICY expense_notes_x ON expense_notes FOR UPDATE USING (true);\n'
    const added = newFileLines(file(Buffer.from(sql)))
    expect(added).toContain('CREATE POLICY expense_notes_x ON expense_notes FOR UPDATE USING (true);')
    expect(classify([{ path: 'migrations/1700000000099_x.sql', status: 'A', added }]).level).toBe(3)
    // Avant le correctif : contenu ignoré, la même migration ne ressortait pas en niveau 3.
    expect(classify([{ path: 'migrations/1700000000099_x.sql', status: 'A', added: [] }]).level).toBeLessThan(3)
  })
  it('lien symbolique, fichier spécial ou trop gros : jamais lu (la lecture pourrait bloquer)', () => {
    let reads = 0
    const tracked = (isFile: boolean, size: number) => ({ stat: () => ({ isFile: () => isFile, size }), read: () => (reads++, Buffer.from('x')) })
    expect(newFileLines(tracked(false, 1))).toEqual([]) // lien symbolique, FIFO, /dev/zero : lstat dit « pas un fichier »
    expect(newFileLines(tracked(true, 600 * 1024))).toEqual([]) // taille vérifiée avant la lecture
    expect(reads).toBe(0)
  })
  it('fichier illisible ou binaire : aucune ligne, sans erreur', () => {
    expect(newFileLines({ stat: () => { throw new Error('ENOENT') }, read: () => Buffer.from('') })).toEqual([])
    expect(newFileLines(file(Buffer.from([0x89, 0x50, 0x00, 0x47])))).toEqual([])
  })
})
