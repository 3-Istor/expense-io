// Semver du contrat : le comparateur (oasdiff) classe, la règle tranche. Cas repris des fixtures de sdi-harness
// (rupture sans majeure, ajout sans mineure, contrat inchangé, version invalide).
import { describe, expect, it } from 'vitest'
import { changeKind, checkChangelog, checkVersion } from '../../verify/lib/contract-version'

const info = { id: 'response-optional-property-added', text: 'ajout', level: 1 }
const error = { id: 'response-required-property-removed', text: 'retrait', level: 3 }

describe('semver du contrat', () => {
  it('classe le changement à partir du verdict d\'oasdiff', () => {
    expect(changeKind([info, error], true)).toBe('breaking')
    expect(changeKind([{ ...info, level: 2 }], true)).toBe('breaking') // un avertissement compte comme une rupture
    expect(changeKind([info], true)).toBe('additive')
    expect(changeKind([], true)).toBe('patch')
    expect(changeKind([], false)).toBe('unchanged')
  })
  it('une rupture exige une version majeure', () => {
    expect(checkVersion('1.0.0', '1.1.0', 'breaking').ok).toBe(false)
    expect(checkVersion('1.0.0', '2.0.0', 'breaking').ok).toBe(true)
  })
  it('un ajout exige au moins une mineure, un texte au moins un patch', () => {
    expect(checkVersion('1.0.0', '1.0.1', 'additive').ok).toBe(false)
    expect(checkVersion('1.0.0', '1.1.0', 'additive').ok).toBe(true)
    expect(checkVersion('1.0.0', '1.0.0', 'patch').ok).toBe(false)
    expect(checkVersion('1.0.0', '1.0.1', 'patch').ok).toBe(true)
  })
  it('contrat inchangé : version libre de rester, jamais de reculer', () => {
    expect(checkVersion('1.0.0', '1.0.0', 'unchanged').ok).toBe(true)
    expect(checkVersion('1.0.0', '0.9.0', 'unchanged').ok).toBe(false)
    expect(checkVersion('1.0', '1.0.0', 'unchanged').ok).toBe(false)
  })
  it('le changelog a une section par version, et une rupture cite son ADR', () => {
    const log = '# Changelog\n\n## 2.0.0 — 2026-11-02\n\nStatut ajouté (ADR 0005).\n\n## 1.1.0 — 2026-10-30\n\nChamp ajouté.\n'
    expect(checkChangelog(log, '1.1.0', 'additive').ok).toBe(true)
    expect(checkChangelog(log, '2.0.0', 'breaking').ok).toBe(true)
    expect(checkChangelog(log.replace('ADR 0005', 'ADR à venir'), '2.0.0', 'breaking').ok).toBe(false)
    expect(checkChangelog(log, '1.2.0', 'additive').ok).toBe(false)
  })
})
