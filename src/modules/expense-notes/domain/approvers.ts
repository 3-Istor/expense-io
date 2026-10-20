// Règles d'accès des valideurs, en un seul endroit (« module central de règles », docs/vision.md).
// Le périmètre exact (subordonnés directs, managers racine de l'entreprise) est appliqué par le dépôt de notes ;
// le domaine décide QUI est valideur et de quel type.

export type Role = 'employee' | 'manager' | 'hr_admin'
export type ApproverKind = 'manager' | 'hr'

/** Le type de valideur attendu par une route, ou null si le rôle ne correspond pas. */
export function approverKind(role: Role, expected: ApproverKind): ApproverKind | null {
  if (expected === 'manager' && role === 'manager') return 'manager'
  if (expected === 'hr' && role === 'hr_admin') return 'hr'
  return null
}
