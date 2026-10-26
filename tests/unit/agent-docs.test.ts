// S10 : un guide de l'agent qui ment au dépôt, ou un ticket clos sans preuve, fait échouer la moulinette.
import { describe, expect, it } from 'vitest'
import { guideFindings, ticketFindings } from '../../verify/checks/s10-agent-docs'

const repo = {
  exists: (p: string) => ['docs/workflow.md', 'src/contract', 'verify'].includes(p.replace(/\/$/, '')),
  scripts: ['verify', 'risk'],
  targets: ['dev', 'sonar'],
  skills: ['add-feature'],
}

describe('S10, guides de l\'agent', () => {
  it('accepte un guide qui cite ce qui existe', () => {
    const text = 'Voir `docs/workflow.md`, `src/contract/` et `verify/`. Lancer `npm run verify` puis `make sonar`.'
    expect(guideFindings('AGENTS.md', text, repo)).toEqual([])
  })
  it('signale un chemin, un script, une cible make ou un skill qui n\'existe pas', () => {
    const text = 'Voir `docs/disparu.md`. `npm run lint:api` et `make deploy`.\n## Skills\n| `ghost-skill` | quand |\n'
    const findings = guideFindings('AGENTS.md', text, repo)
    expect(findings).toHaveLength(4)
  })
  it('ignore les gabarits et les noms relatifs', () => {
    expect(guideFindings('AGENTS.md', 'Fichier `docs/adr/NNNN-x.md`, `src/app/api/.../route.ts`, `domain/`.', repo)).toEqual([])
  })
  it('refuse une instruction périmée dans AGENTS.md', () => {
    expect(guideFindings('AGENTS.md', 'La moulinette (à venir, phase 1)', repo)).toHaveLength(1)
  })
})

describe('S10, tickets', () => {
  const ticket = (status: string, box = '[x]') =>
    `---\nid: T-0042\ntitle: X\nstatus: ${status}\nrisk: 2\nsource: session\ncreated: 2026-10-26\nlinks: []\n---\n\n## Critères d'acceptation\n\n- ${box} critère\n`
  it('accepte un ticket complet', () => {
    expect(ticketFindings('docs/tickets/T-0042-x.md', ticket('todo', '[ ]'), () => 0)).toEqual([])
  })
  it('refuse un « done » sans preuve ou avec une case vide', () => {
    expect(ticketFindings('docs/tickets/T-0042-x.md', ticket('done'), () => 0)).toHaveLength(1)
    expect(ticketFindings('docs/tickets/T-0042-x.md', ticket('done', '[ ]'), () => 1)).toHaveLength(1)
    expect(ticketFindings('docs/tickets/T-0042-x.md', ticket('done'), () => 1)).toEqual([])
  })
  it('refuse un en-tête incohérent', () => {
    expect(ticketFindings('docs/tickets/T-0043-x.md', ticket('todo'), () => 0)).toHaveLength(1) // id ≠ nom de fichier
    expect(ticketFindings('docs/tickets/T-0042-x.md', ticket('fini'), () => 0)).toHaveLength(1)
    expect(ticketFindings('docs/tickets/T-0042-x.md', 'pas d\'en-tête', () => 0)).toHaveLength(1)
  })
})
