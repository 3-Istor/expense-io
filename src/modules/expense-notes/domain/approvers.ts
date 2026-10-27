// Règles d'accès des valideurs, en un seul endroit (« module central de règles », docs/vision.md).
// Le domaine décide QUI valide une note ; le dépôt de notes traduit la même règle en SQL (SCOPE) et la RLS la double.

export type Role = 'employee' | 'manager' | 'hr_admin'
export type ApproverKind = 'manager' | 'hr'

/** Le type de valideur attendu par une route, ou null si le rôle ne correspond pas. */
export function approverKind(role: Role, expected: ApproverKind): ApproverKind | null {
  if (expected === 'manager' && role === 'manager') return 'manager'
  if (expected === 'hr' && role === 'hr_admin') return 'hr'
  return null
}

export interface Person {
  id: string
  companyId: string
  managerId: string | null
}

/**
 * Qui valide la note d'un auteur (T-0014, coaching du 2026-10-26) : son manager direct s'il en a un ; sinon un RH de
 * son entreprise, quel que soit le rôle de l'auteur (employé ou manager sans manager, RH). Jamais l'auteur lui-même
 * (SEC-06). Un RH seul dans son entreprise n'a donc pas de valideur : sa note reste en attente, visible dans la
 * métrique métier (T-0015), plutôt qu'une auto-validation.
 */
export function mayDecide(approver: Person & { role: Role }, author: Person): boolean {
  if (approver.id === author.id) return false
  if (author.managerId !== null) return approver.id === author.managerId
  return approver.role === 'hr_admin' && approver.companyId === author.companyId
}
