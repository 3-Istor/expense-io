// Appelant courant, lu dans la session Auth.js. Le rôle y est relu en base à chaque requête (SEC-10, src/lib/auth.ts).
import { auth } from '@/lib/auth'
import { denied } from '@/shared/app-error'
import type { Role } from './domain/user'

export interface CurrentUser {
  userId: string
  role: Role
}

/** L'appelant authentifié ; lève une erreur « denied » sans session. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await auth()
  if (!session?.user) throw denied()
  return { userId: session.user.id, role: session.user.role }
}
