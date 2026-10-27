// Semver du contrat d'API : le numéro de version doit suivre ce que le changement casse pour un client.
// Le type de changement vient d'oasdiff (comparateur réel), jamais d'une déclaration de l'agent.
// Logique reprise de sdi-harness (cli/src/quality/contracts.ts, R-CONV-VER-01/02), adaptée au contrat gelé d'Expense.io.

export type ChangeKind = 'breaking' | 'additive' | 'patch' | 'unchanged'

export interface OasdiffChange {
  id: string
  text: string
  /** 1 info (compatible), 2 avertissement, 3 erreur (rupture). */
  level: number
  operation?: string
  path?: string
}

/**
 * Ajouter une valeur à un enum de réponse : oasdiff le classe en erreur (un client qui fait un `switch` exhaustif peut
 * casser), notre politique en ajout compatible, version mineure (ADR 0006, coaching du 2026-10-26). Le contrat demande aux
 * clients de tolérer une valeur inconnue (docs/contract.md).
 */
const ADDITIVE_BY_POLICY: ReadonlySet<string> = new Set([
  'response-property-enum-value-added',
  'response-mediatype-enum-value-added',
])

/**
 * Retirer une valeur d'un enum de réponse : oasdiff le classe en info (le client reçoit moins de cas), notre politique
 * en rupture (coaching : « retirer une valeur, c'est une majeure ») : un client qui affiche ou filtre ce statut perd une
 * fonction. Côté requête, oasdiff le classe déjà en erreur.
 */
const BREAKING_BY_POLICY: ReadonlySet<string> = new Set([
  'response-property-enum-value-removed',
  'response-mediatype-enum-value-removed',
])

/** Niveau retenu par notre politique : celui d'oasdiff, sauf les deux listes ci-dessus. */
function policyLevel(change: OasdiffChange): number {
  if (ADDITIVE_BY_POLICY.has(change.id)) return 1
  if (BREAKING_BY_POLICY.has(change.id)) return 3
  return change.level
}

/** Rupture si oasdiff signale une erreur ou un avertissement (hors politique ci-dessus) ; ajout si seulement des infos ; patch si la spec diffère sans changement visible du contrat. */
export function changeKind(changes: OasdiffChange[], specsDiffer: boolean): ChangeKind {
  if (changes.some((c) => policyLevel(c) >= 2)) return 'breaking'
  if (changes.length > 0) return 'additive'
  return specsDiffer ? 'patch' : 'unchanged'
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export interface VersionVerdict {
  ok: boolean
  reason: string
}

export function checkVersion(before: string, after: string, kind: ChangeKind): VersionVerdict {
  const a = SEMVER.exec(before)
  const b = SEMVER.exec(after)
  if (!a || !b) return { ok: false, reason: `version invalide (${before} → ${after}) : attendu MAJEURE.MINEURE.PATCH` }
  const [ma, mi, pa] = a.slice(1).map(Number)
  const [mb, mib, pb] = b.slice(1).map(Number)
  const greater = mb > ma || (mb === ma && (mib > mi || (mib === mi && pb > pa)))
  if (kind === 'unchanged') {
    return before === after || greater
      ? { ok: true, reason: before === after ? 'contrat inchangé, version inchangée' : `contrat inchangé, version publiée ${after}` }
      : { ok: false, reason: `version en recul (${before} → ${after})` }
  }
  if (!greater) return { ok: false, reason: `contrat modifié (${kind}) mais version inchangée ou en recul (${before} → ${after})` }
  if (kind === 'breaking' && mb <= ma) return { ok: false, reason: `rupture de contrat : il faut une version majeure (${before} → ${ma + 1}.0.0)` }
  if (kind === 'additive' && mb === ma && mib === mi) return { ok: false, reason: `ajout compatible : il faut au moins une version mineure (${before} → ${ma}.${mi + 1}.0)` }
  return { ok: true, reason: `${kind} : ${before} → ${after}` }
}

/**
 * Le changelog du contrat doit avoir une section pour la nouvelle version ; une rupture doit citer un ADR qui existe et
 * qu'un humain a accepté (un ADR « proposé » par l'agent ne suffit pas). `adrStatus` renvoie la ligne de statut d'un ADR.
 */
export function checkChangelog(
  changelog: string,
  version: string,
  kind: ChangeKind,
  adrStatus: (id: string) => string | undefined = () => undefined,
): VersionVerdict {
  const heading = new RegExp(`^## ${version.replaceAll('.', '\\.')}\\b.*$`, 'm')
  const match = heading.exec(changelog)
  if (!match) return { ok: false, reason: `docs/contract-changelog.md n'a pas de section « ## ${version} »` }
  const section = changelog.slice(match.index).split(/\n## /)[0]
  if (kind === 'breaking') {
    const ids = [...section.matchAll(/ADR (\d{4})/g)].map((m) => m[1])
    if (ids.length === 0) return { ok: false, reason: `la section ${version} doit citer l'ADR qui autorise la rupture (« ADR 00xx »)` }
    if (!ids.some((id) => /accepté/i.test(adrStatus(id) ?? ''))) {
      return { ok: false, reason: `rupture : l'ADR ${ids.join(', ')} doit exister et être accepté par un humain` }
    }
  }
  return { ok: true, reason: `changelog ${version} présent` }
}
