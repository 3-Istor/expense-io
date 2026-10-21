import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { ensureAuthSecret } from '@/lib/auth-secret'
import { identity } from '@/modules/identity'

// Le secret vient de l'environnement, jamais du code (SEC-02) ; absent ou public, il est remplacé par un secret
// aléatoire propre au processus (src/lib/auth-secret.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: ensureAuthSecret(),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      // Vérification déléguée au module identity (comptes, mots de passe).
      authorize: (credentials) => identity.verifyCredentials(credentials?.email, credentials?.password),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // Le jeton est une photo prise à la connexion (SEC-10) : le rôle est relu en base à chaque requête, et un
      // compte supprimé perd sa session immédiatement.
      if (typeof token.id === 'string') {
        const role = await identity.currentRole(token.id)
        if (!role) return null
        token.role = role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'employee' | 'manager' | 'hr_admin'
      }
      return session
    },
  },
})
