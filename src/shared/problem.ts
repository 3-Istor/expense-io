// Erreurs au format RFC 9457 (Problem Details), servies par négociation de contenu (ADR 0005).
// Un client qui envoie `Accept: application/problem+json` reçoit le format standard ; tous les autres reçoivent le
// format historique `{ error }`, à l'identique : aucun client existant (ni les tests cachés) ne voit de différence.
import type { AppErrorKind } from './app-error'

const PROBLEM_JSON = 'application/problem+json'

/** Type de problème : identifiant stable lisible par une machine (RFC 9457 §3.1.1), pas une URL à charger. */
export type ProblemKind = Exclude<AppErrorKind, 'denied'> | 'unauthenticated' | 'forbidden' | 'internal'

const TITLES: Record<ProblemKind, string> = {
  invalid: 'Requête invalide',
  unauthenticated: 'Authentification requise',
  forbidden: 'Accès refusé',
  'not-found': 'Ressource introuvable',
  conflict: 'Conflit avec l’état de la ressource',
  internal: 'Erreur interne',
}

/** Le client demande-t-il explicitement le format RFC 9457 ? */
export function wantsProblem(accept: string | null): boolean {
  return (accept ?? '').split(',').some((part) => part.trim().split(';')[0].toLowerCase() === PROBLEM_JSON)
}

/**
 * Corps et en-têtes d'une erreur. `status` du corps égale toujours le code HTTP (RFC 9457 §3.1.2) ; `error` reste
 * présent (membre d'extension) pour qu'un client qui lit l'ancien champ continue de fonctionner.
 */
export function errorResponse(
  status: number,
  kind: ProblemKind,
  detail: string,
  options: { problem: boolean; extra?: Record<string, unknown> },
): Response {
  if (!options.problem) return Response.json({ error: detail, ...options.extra }, { status })
  const body = { type: `urn:expense-io:problem:${kind}`, title: TITLES[kind], status, detail, error: detail, ...options.extra }
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': PROBLEM_JSON } })
}
