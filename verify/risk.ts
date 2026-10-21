// Classement déterministe d'un changement dans les niveaux de risque d'AGENTS.md (0 cosmétique → 3 critique).
// Pas de jugement de l'agent : des règles écrites, testées (tests/unit/risk.test.ts), que l'humain peut relire.
// Usage : `npm run risk` (diff contre origin/main) ou `npm run risk -- --base <ref>`.

export type RiskLevel = 0 | 1 | 2 | 3

export interface ChangedFile {
  path: string
  /** A ajouté, M modifié, D supprimé, R renommé (lettres de `git diff --name-status`). */
  status: 'A' | 'M' | 'D' | 'R'
  /** Lignes ajoutées du diff (sans le « + »), pour les règles qui regardent le contenu. */
  added?: string[]
}

export interface RiskReport {
  level: RiskLevel
  reasons: { level: RiskLevel; file: string; reason: string }[]
  /** Ce que l'humain doit faire, d'après le tableau d'AGENTS.md. */
  checkpoint: string
}

const CHECKPOINTS: Record<RiskLevel, string> = {
  0: 'Aucun point de contrôle en direct.',
  1: "L'humain lit le résumé de preuves (moulinette verte, tests).",
  2: "L'humain valide le diff du contrat AVANT le code.",
  3: "L'humain valide le plan, puis relit le diff sensible.",
}

interface Rule {
  level: RiskLevel
  reason: string
  match: (file: ChangedFile) => boolean
}

const path = (re: RegExp) => (f: ChangedFile) => re.test(f.path)
const adds = (re: RegExp) => (f: ChangedFile) => (f.added ?? []).some((line) => re.test(line))

// Ordre sans importance : le niveau retenu est le plus élevé déclenché (« le plus élevé l'emporte »).
const RULES: Rule[] = [
  // Niveau 3 : authentification, isolation, règles d'accès, RLS, secrets, CI, moulinette, harnais de l'agent.
  { level: 3, reason: 'authentification ou session', match: path(/^src\/(lib\/auth|lib\/auth-secret|instrumentation|modules\/identity\/(session|infrastructure)|app\/actions\/auth)/) },
  { level: 3, reason: "isolation (contexte utilisateur, accès base)", match: path(/^src\/lib\/db\.ts$/) },
  { level: 3, reason: "règles d'accès des valideurs", match: path(/^src\/modules\/expense-notes\/(domain\/approvers|infrastructure\/pg-)/) },
  // Contenu SQL seulement : un mot-clé cité dans du TypeScript ou de la doc ne déclenche rien.
  { level: 3, reason: 'RLS, rôles ou droits PostgreSQL', match: (f) => /^migrations\/|\.sql$/.test(f.path) && adds(/\b(POLICY|ROW LEVEL SECURITY|GRANT|REVOKE|CREATE ROLE|ALTER ROLE|BYPASSRLS|SET ROLE)\b/i)(f) },
  { level: 3, reason: 'secrets ou configuration sensible', match: path(/(^|\/)\.env(\.|$)|^\.gitleaksignore$|^docs\/security\/false-positives\.md$/) },
  { level: 3, reason: 'CI', match: path(/^\.github\//) },
  { level: 3, reason: 'moulinette ou ses règles', match: path(/^(verify\/|\.semgrep\/|\.dependency-cruiser\.cjs$|\.spectral\.yaml$|redocly\.yaml$)/) },
  { level: 3, reason: "harnais de l'agent", match: path(/^(\.claude\/|AGENTS\.md$|CLAUDE\.md$)/) },
  { level: 3, reason: 'test supprimé', match: (f) => f.status === 'D' && /(^tests\/|\.test\.ts$|\.spec\.ts$)/.test(f.path) },
  // Appel réel en début d'instruction (pas une chaîne de caractères qui cite le mot).
  { level: 3, reason: 'test affaibli (fail, skip, only)', match: (f) => /^tests\//.test(f.path) && adds(/^\s*(test|it|describe)\.(fail|skip|fixme|only)\(|^\s*knownFlaw\(/)(f) },

  // Niveau 2 : contrat, nouvel endpoint, migration, dépendances de production.
  { level: 2, reason: "contrat d'API", match: path(/^(src\/contract\/|docs\/openapi\.yaml$|docs\/contract\.md$)/) },
  { level: 2, reason: 'nouvel endpoint', match: (f) => f.status === 'A' && /^src\/app\/api\/.+\/route\.ts$/.test(f.path) },
  { level: 2, reason: 'migration de base', match: path(/^migrations\//) },
  { level: 2, reason: 'dépendances ou image de production', match: path(/^(package\.json|package-lock\.json|Dockerfile|docker-compose\.yml)$/) },

  // Niveau 1 : code de l'application ou tests, sans les déclencheurs ci-dessus.
  { level: 1, reason: "code de l'application", match: path(/^(src|scripts)\/.+\.(ts|tsx|mjs|js)$/) },
  { level: 1, reason: 'tests', match: path(/^tests\//) },

  // Niveau 0 : documentation et style.
  { level: 0, reason: 'documentation ou style', match: path(/\.(md|css)$|^docs\//) },
]

export function classify(files: ChangedFile[]): RiskReport {
  const reasons: RiskReport['reasons'] = []
  for (const file of files) {
    const matched = RULES.filter((rule) => rule.match(file))
    // Un fichier qu'aucune règle ne connaît est traité en niveau 1 : on peut monter, jamais descendre.
    if (matched.length === 0) reasons.push({ level: 1, file: file.path, reason: 'fichier hors des règles connues' })
    for (const rule of matched) reasons.push({ level: rule.level, file: file.path, reason: rule.reason })
  }
  // Plusieurs modules métier touchés : niveau 2 (AGENTS.md).
  const modules = new Set(files.map((f) => /^src\/modules\/([^/]+)\//.exec(f.path)?.[1]).filter(Boolean))
  if (modules.size > 1) reasons.push({ level: 2, file: [...modules].join(', '), reason: 'plusieurs modules métier' })

  const level = reasons.reduce<RiskLevel>((max, r) => (r.level > max ? r.level : max), 0)
  reasons.sort((a, b) => b.level - a.level)
  return { level, reasons, checkpoint: CHECKPOINTS[level] }
}
