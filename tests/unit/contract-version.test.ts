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
  it('ajouter une valeur à un enum de réponse est un ajout mineur (ADR 0006)', () => {
    const added = { id: 'response-property-enum-value-added', text: 'valeur ajoutée', level: 3, operation: 'GET', path: '/api/expense-notes' }
    expect(changeKind([added], true)).toBe('additive')
    expect(changeKind([{ ...added, id: 'response-mediatype-enum-value-added' }], true)).toBe('additive')
    expect(checkVersion('1.1.0', '1.2.0', changeKind([added], true)).ok).toBe(true)
    expect(changeKind([added, error], true)).toBe('breaking') // la politique n'efface pas une autre rupture
  })
  it('retirer une valeur d\'enum reste une rupture', () => {
    const removed = { id: 'response-property-enum-value-removed', text: 'valeur retirée', level: 1 }
    const requestRemoved = { id: 'request-property-enum-value-removed', text: 'valeur retirée', level: 3 }
    expect(changeKind([requestRemoved], true)).toBe('breaking')
    // oasdiff classe le retrait côté réponse en info : notre politique le remonte en rupture
    expect(changeKind([removed], true)).toBe('breaking')
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
    const status = (id: string) => ({ '0005': '- Statut : accepté (2026-11-01)', '0006': '- Statut : proposé' })[id]
    expect(checkChangelog(log, '2.0.0', 'breaking', status).ok).toBe(true)
    expect(checkChangelog(log.replace('0005', '0006'), '2.0.0', 'breaking', status).ok).toBe(false) // proposé par l'agent
    expect(checkChangelog(log.replace('0005', '0009'), '2.0.0', 'breaking', status).ok).toBe(false) // inexistant
    expect(checkChangelog(log.replace('ADR 0005', 'ADR à venir'), '2.0.0', 'breaking').ok).toBe(false)
    expect(checkChangelog(log, '1.2.0', 'additive').ok).toBe(false)
  })
})
