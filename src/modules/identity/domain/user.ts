// Domaine de l'identité : utilisateurs, rôles, rattachement hiérarchique. Aucune dépendance technique.

export type Role = 'employee' | 'manager' | 'hr_admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  managerId: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Corps attendu pour un rattachement : `{ managerId: <uuid> | null }`, rien d'autre (SEC-09). */
export function parseManagerAssignment(body: unknown): { managerId: string | null } | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body) || !('managerId' in body)) return null
  const { managerId } = body as { managerId: unknown }
  if (managerId === null) return { managerId: null }
  return typeof managerId === 'string' && UUID.test(managerId) ? { managerId } : null
}

/** Refus de rattachement que le domaine peut trancher seul ; l'entreprise et les cycles sont vérifiés en base. */
export function checkManagerAssignment(targetId: string, managerId: string | null): 'self' | null {
  return managerId !== null && managerId === targetId ? 'self' : null
}

export const MIN_PASSWORD_LENGTH = 8
// Deux classes disjointes du « @ » : vérification linéaire, sans retour arrière exponentiel (Sonar S8786, ReDoS).
const EMAIL_SHAPE = /^[^\s@]+@([^\s@]+)$/

/** Domaine d'un email `local@domaine` dont le domaine contient un point ni en tête ni en fin ; null sinon. */
export function emailDomain(email: string): string | null {
  const domain = EMAIL_SHAPE.exec(email)?.[1]
  return domain && domain.slice(1, -1).includes('.') ? domain.toLowerCase() : null
}

export interface Registration {
  name: string
  email: string
  password: string
  /** Domaine de l'email : il désigne l'entreprise (risque documenté, SEC-15, ADR 0004). */
  domain: string
}

export function validateRegistration(input: { name: unknown; email: unknown; password: unknown }): Registration | null {
  const domain = typeof input.email === 'string' ? emailDomain(input.email) : null
  if (typeof input.name !== 'string' || input.name.trim().length === 0) return null
  if (!domain || typeof input.email !== 'string') return null
  if (typeof input.password !== 'string' || input.password.length < MIN_PASSWORD_LENGTH) return null
  return { name: input.name.trim(), email: input.email, password: input.password, domain }
}
