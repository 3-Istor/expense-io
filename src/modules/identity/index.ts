// API publique du module identity. `requireUser` (session.ts) est à part : il dépend d'Auth.js, qui dépend de ce
// module pour vérifier les identifiants.
import bcrypt from 'bcryptjs'
import { log } from '@/lib/logger'
import { identityUseCases } from './application/use-cases'
import { pgAccountStore, pgUserRepository } from './infrastructure/pg-user-repository'

export const identity = identityUseCases({
  users: pgUserRepository,
  accounts: pgAccountStore,
  verifyPassword: (password, hash) => bcrypt.compare(password, hash),
  hashPassword: (password) => bcrypt.hash(password, 12),
  // Chaque changement de manager laisse aussi une ligne de journal (T-0020), en plus de la table d'historique.
  events: {
    managerChanged: (event) => log('info', 'manager modifié', { event: 'manager.changed', ...event }),
  },
})

export type { Role, User } from './domain/user'
