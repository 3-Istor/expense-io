import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import type { Check, CheckResult } from '../types'

// Les guides de l'agent (AGENTS.md, skills, workflow) sont du code pour un LLM : une instruction fausse (chemin disparu,
// commande renommée, « à venir » resté après livraison) le fait agir à tort. OpenAI (Harness engineering, 2026) vérifie
// sa documentation en CI pour la même raison. Ce contrôle les confronte au dépôt réel, et vérifie le format des tickets.

const GUIDES = ['AGENTS.md', 'CLAUDE.md', 'docs/workflow.md']
const TICKET_DIR = 'docs/tickets'
const EVIDENCE_DIR = 'docs/evidence'
const STATUSES = ['todo', 'doing', 'blocked', 'done']
const SOURCES = ['audit', 'session', 'review', 'prof', 'human']

function guideFiles(): string[] {
  const skills = existsSync('.claude/skills')
    ? readdirSync('.claude/skills').map((d) => path.join('.claude/skills', d, 'SKILL.md')).filter(existsSync)
    : []
  return [...GUIDES.filter(existsSync), ...skills]
}

/** Problèmes d'un guide : chemins cités absents, scripts npm ou cibles make inconnus, skills inexistants, mention « à venir ». */
export function guideFindings(file: string, text: string, repo: { exists: (p: string) => boolean; scripts: string[]; targets: string[]; skills: string[] }): string[] {
  const findings: string[] = []
  for (const [, ref] of text.matchAll(/`([^`\s]+)`/g)) {
    const candidate = ref.replace(/[),.;:]+$/, '')
    // Chemins depuis la racine seulement : un nom relatif (`domain/`, `db.ts`) s'entend dans le contexte de sa phrase.
    const looksLikePath = /^(src|docs|verify|scripts|tests|migrations|\.claude|\.github|\.githooks)\/[\w./-]*$|^[A-Z][\w-]*\.md$|^\.(npmrc|env\.example)$/.test(candidate)
    const placeholder = /[<>*]|NNNN|X\.Y\.Z|AAAA|\.\.\./.test(candidate)
    if (looksLikePath && !placeholder && !repo.exists(candidate)) findings.push(`${file} : \`${candidate}\` n'existe pas`)
  }
  for (const [, script] of text.matchAll(/npm run (?:-s )?([\w:-]+)/g)) {
    if (!repo.scripts.includes(script)) findings.push(`${file} : script npm \`${script}\` inconnu`)
  }
  for (const [, target] of text.matchAll(/`make ([\w-]+)`/g)) {
    if (!repo.targets.includes(target)) findings.push(`${file} : cible \`make ${target}\` inconnue`)
  }
  if (file === 'AGENTS.md') {
    const table = text.split('## Skills')[1]?.split('\n## ')[0] ?? ''
    for (const [, skill] of table.matchAll(/^\| `([\w-]+)` \|/gm)) {
      if (!repo.skills.includes(skill)) findings.push(`AGENTS.md : skill \`${skill}\` absent de .claude/skills`)
    }
    if (/(^|[\s(])à venir\b|\bTODO\b/i.test(text)) findings.push('AGENTS.md : mention « à venir » ou TODO (instruction périmée)')
  }
  return findings
}

interface TicketMeta {
  id?: string
  title?: string
  status?: string
  risk?: number
  source?: string
  created?: string
}

/** Un ticket : en-tête complet, statut connu ; « done » exige des critères tous cochés et une preuve rangée. */
export function ticketFindings(file: string, text: string, evidence: (id: string) => number): string[] {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (!match) return [`${file} : en-tête YAML absent`]
  let meta: TicketMeta
  try {
    meta = (parse(match[1]) ?? {}) as TicketMeta
  } catch (error) {
    return [`${file} : en-tête YAML invalide (${(error as Error).message.split('\n')[0]})`]
  }
  const findings: string[] = []
  const id = /^(T-\d{4})-/.exec(path.basename(file))?.[1]
  if (!id || meta.id !== id) findings.push(`${file} : id « ${meta.id} » différent du nom de fichier`)
  if (!meta.title) findings.push(`${file} : titre absent`)
  if (!STATUSES.includes(meta.status ?? '')) findings.push(`${file} : statut « ${meta.status} » (attendu : ${STATUSES.join(', ')})`)
  if (![0, 1, 2, 3].includes(Number(meta.risk))) findings.push(`${file} : niveau de risque absent (0 à 3)`)
  if (!SOURCES.includes(meta.source ?? '')) findings.push(`${file} : source « ${meta.source} » (attendu : ${SOURCES.join(', ')})`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(meta.created ?? ''))) findings.push(`${file} : date de création absente`)
  if (!/^## Critères d'acceptation/m.test(text)) findings.push(`${file} : section « Critères d'acceptation » absente`)
  if (meta.status === 'done') {
    if (/^- \[ \]/m.test(text)) findings.push(`${file} : « done » avec des critères non cochés`)
    if (id && evidence(id) === 0) findings.push(`${file} : « done » sans preuve dans ${EVIDENCE_DIR}/${id}/`)
  }
  return findings
}

export const s10AgentDocs: Check = {
  id: 'S10',
  title: "Guides de l'agent et tickets",
  risk: "Instruction périmée qui fait agir l'agent à tort ; ticket clos sans preuve",
  levels: ['fast', 'pr', 'nightly'],
  blocking: true,
  async run(): Promise<CheckResult> {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
    const repo = {
      exists: (p: string) => existsSync(p.replace(/\/$/, '')),
      scripts: Object.keys(pkg.scripts),
      targets: [...readFileSync('Makefile', 'utf8').matchAll(/^([\w-]+):/gm)].map((m) => m[1]),
      skills: existsSync('.claude/skills') ? readdirSync('.claude/skills') : [],
    }
    const findings = guideFiles().flatMap((f) => guideFindings(f, readFileSync(f, 'utf8'), repo))
    const tickets = existsSync(TICKET_DIR) ? readdirSync(TICKET_DIR).filter((f) => /^T-\d{4}-.+\.md$/.test(f)) : []
    const evidence = (id: string) => (existsSync(path.join(EVIDENCE_DIR, id)) ? readdirSync(path.join(EVIDENCE_DIR, id)).length : 0)
    for (const t of tickets) findings.push(...ticketFindings(path.join(TICKET_DIR, t), readFileSync(path.join(TICKET_DIR, t), 'utf8'), evidence))
    const ids = tickets.map((t) => t.slice(0, 6))
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    if (duplicates.length) findings.push(`tickets en double : ${[...new Set(duplicates)].join(', ')}`)
    const open = tickets.filter((t) => !/^status: done$/m.test(readFileSync(path.join(TICKET_DIR, t), 'utf8'))).length
    const metrics = { agentDocFindings: findings.length, ticketsOpen: open, ticketsTotal: tickets.length }
    if (findings.length) return { status: 'fail', summary: `${findings.length} problème(s) : ${findings.slice(0, 3).join(' ; ')}`, metrics, details: findings }
    return { status: 'pass', summary: `${guideFiles().length} guides à jour avec le dépôt ; ${tickets.length} tickets valides (${open} ouverts)`, metrics }
  },
}
