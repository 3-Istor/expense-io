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

/** Rupture si oasdiff signale une erreur ou un avertissement ; ajout si seulement des infos ; patch si la spec diffère sans changement visible du contrat. */
export function changeKind(changes: OasdiffChange[], specsDiffer: boolean): ChangeKind {
  if (changes.some((c) => c.level >= 2)) return 'breaking'
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

/** Le changelog du contrat doit avoir une section pour la nouvelle version ; une rupture doit citer son ADR. */
export function checkChangelog(changelog: string, version: string, kind: ChangeKind): VersionVerdict {
  const heading = new RegExp(`^## ${version.replaceAll('.', '\\.')}\\b.*$`, 'm')
  const match = heading.exec(changelog)
  if (!match) return { ok: false, reason: `docs/contract-changelog.md n'a pas de section « ## ${version} »` }
  const section = changelog.slice(match.index).split(/\n## /)[0]
  if (kind === 'breaking' && !/ADR \d{4}/.test(section)) {
    return { ok: false, reason: `la section ${version} doit citer l'ADR qui autorise la rupture (« ADR 00xx »)` }
  }
  return { ok: true, reason: `changelog ${version} présent` }
}
