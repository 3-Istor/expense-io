import type { Role, User } from './domain/user'

export interface Caller {
  userId: string
}

/** `previousManagerId` : le rattachement d'avant, pour l'historique (T-0020). */
export type AssignmentResult =
  | { ok: true; user: User; previousManagerId: string | null }
  | { ok: false; reason: 'target-not-found' | 'invalid-manager' }

export interface UserRepository {
  /** Employés et managers de l'entreprise de l'appelant, triés par nom. */
  listDirectory(caller: Caller): Promise<User[]>
  /**
   * Rattache `targetId` à `managerId` (ou le détache) dans une seule transaction : la cible doit être un employé ou
   * un manager de l'entreprise de l'appelant, le manager un manager de la même entreprise (SEC-04), sans créer de
   * cycle (SEC-14). Un changement effectif est inscrit dans l'historique `manager_changes`, dans la même transaction
   * (T-0020) : qui, quand, avant, après.
   */
  assignManager(caller: Caller, targetId: string, managerId: string | null): Promise<AssignmentResult>
}

/** Événements du module identité, pour les journaux (T-0020). */
export interface IdentityEvents {
  managerChanged(event: { targetId: string; previousManagerId: string | null; newManagerId: string | null; changedBy: string }): void
}

/** Accès aux comptes AVANT toute session (connexion) et relecture du rôle à chaque requête (SEC-10). */
export interface AccountStore {
  findByEmail(email: string): Promise<{ id: string; email: string; role: Role; passwordHash: string } | null>
  roleOf(userId: string): Promise<Role | null>
  /**
   * Crée le compte et, si besoin, l'entreprise de son domaine (le premier inscrit en devient RH), en une transaction.
   * 'email-taken' si l'email existe déjà.
   */
  register(account: { name: string; email: string; passwordHash: string; domain: string }): Promise<'created' | 'email-taken'>
}
