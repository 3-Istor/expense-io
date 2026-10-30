import { conflict, denied, notFound } from '@/shared/app-error'
import { isUuid } from '@/shared/ids'
import {
  checkManagerAssignment,
  MIN_PASSWORD_LENGTH,
  parseManagerAssignment,
  validateRegistration,
  type Role,
  type User,
} from '../domain/user'
import type { AccountStore, Caller, IdentityEvents, UserRepository } from '../ports'

export interface Actor extends Caller {
  role: Role
}

export interface Deps {
  users: UserRepository
  accounts: AccountStore
  verifyPassword: (password: string, hash: string) => Promise<boolean>
  hashPassword: (password: string) => Promise<string>
  events?: IdentityEvents
}

const NO_EVENTS: IdentityEvents = { managerChanged() {} }

export function identityUseCases({ users, accounts, verifyPassword, hashPassword, events = NO_EVENTS }: Deps) {
  function requireHr(actor: Actor) {
    if (actor.role !== 'hr_admin') throw denied()
  }

  return {
    async directory(actor: Actor): Promise<User[]> {
      requireHr(actor)
      return users.listDirectory(actor)
    },

    async assignManager(actor: Actor, targetId: string, body: unknown): Promise<User> {
      requireHr(actor)
      const parsed = parseManagerAssignment(body)
      // Corps illisible : refusé avec le 409 « manager invalide » déjà au contrat, rien n'est modifié (SEC-09).
      if (!parsed) throw conflict('Invalid manager')
      if (!isUuid(targetId)) throw notFound()
      if (checkManagerAssignment(targetId, parsed.managerId) === 'self') throw conflict('Invalid manager')
      const result = await users.assignManager(actor, targetId, parsed.managerId)
      if (result.ok) {
        // Changement effectif seulement : réaffecter le même manager n'est pas un événement (T-0020). On compare au
        // manager relu en base (UUID normalisé), pas à la saisie du client.
        if (result.previousManagerId !== result.user.managerId) {
          events.managerChanged({
            targetId,
            previousManagerId: result.previousManagerId,
            newManagerId: result.user.managerId,
            changedBy: actor.userId,
          })
        }
        return result.user
      }
      if (result.reason === 'target-not-found') throw notFound()
      throw conflict('Invalid manager')
    },

    /** Vérifie un couple email / mot de passe (connexion Auth.js) ; null si refusé. */
    async verifyCredentials(email: unknown, password: unknown): Promise<{ id: string; email: string; role: Role } | null> {
      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return null
      const account = await accounts.findByEmail(email)
      if (!account || !(await verifyPassword(password, account.passwordHash))) return null
      return { id: account.id, email: account.email, role: account.role }
    },

    /** Inscription : message d'erreur à afficher, ou null si le compte est créé. */
    async register(input: { name: unknown; email: unknown; password: unknown }): Promise<string | null> {
      const registration = validateRegistration(input)
      if (!registration) {
        return `Nom requis, email invalide, ou mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères minimum).`
      }
      const { password, ...rest } = registration
      const outcome = await accounts.register({ ...rest, passwordHash: await hashPassword(password) })
      return outcome === 'email-taken' ? 'Un compte existe déjà avec cet email.' : null
    },

    /** Rôle actuel en base ; null si le compte n'existe plus (la session tombe). */
    currentRole: (userId: string) => accounts.roleOf(userId),
  }
}
