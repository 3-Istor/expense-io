import { describe, expect, it } from 'vitest'
import { identityUseCases } from '@/modules/identity/application/use-cases'
import type { AccountStore, UserRepository } from '@/modules/identity/ports'
import { AppError } from '@/shared/app-error'

function setup(over: { users?: Partial<UserRepository>; accounts?: Partial<AccountStore> } = {}) {
  return identityUseCases({
    users: over.users as UserRepository,
    accounts: over.accounts as AccountStore,
    verifyPassword: async (password, hash) => hash === `hash:${password}`,
    hashPassword: async (password) => `hash:${password}`,
  })
}
const kindOf = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e) => (e instanceof AppError ? e.kind : 'autre'),
  )
const hr = { userId: 'rh', role: 'hr_admin' as const }
const uuid = '11111111-1111-4111-8111-111111111111'

describe('rattachement de manager', () => {
  it('réservé au RH', async () => {
    expect(await kindOf(setup().assignManager({ userId: 'm', role: 'manager' }, 'cible', { managerId: null }))).toBe('denied')
  })
  it('400 si le corps est invalide (SEC-09), 409 si on se rattache à soi-même', async () => {
    for (const body of [undefined, {}, { managerId: 'x' }, { managerId: 3 }, [uuid]]) {
      expect(await kindOf(setup().assignManager(hr, 'cible', body))).toBe('invalid')
    }
    expect(await kindOf(setup().assignManager(hr, uuid, { managerId: uuid }))).toBe('conflict')
  })
  it('traduit les refus du dépôt : 404 cible inconnue, 409 manager invalide', async () => {
    const refuse = (reason: 'target-not-found' | 'invalid-manager') =>
      setup({ users: { assignManager: async () => ({ ok: false, reason }) } }).assignManager(hr, 'cible', { managerId: null })
    expect(await kindOf(refuse('target-not-found'))).toBe('not-found')
    expect(await kindOf(refuse('invalid-manager'))).toBe('conflict')
  })
})

describe('connexion et inscription', () => {
  const account = { id: 'u1', email: 'a@x.io', role: 'employee' as const, passwordHash: 'hash:secret12' }
  it('vérifie le mot de passe', async () => {
    const id = setup({ accounts: { findByEmail: async () => account } })
    expect(await id.verifyCredentials('a@x.io', 'secret12')).toEqual({ id: 'u1', email: 'a@x.io', role: 'employee' })
    expect(await id.verifyCredentials('a@x.io', 'mauvais')).toBeNull()
    expect(await id.verifyCredentials(undefined, 'secret12')).toBeNull()
  })
  it('valide l\'inscription et ne transmet jamais le mot de passe en clair', async () => {
    const seen: unknown[] = []
    const id = setup({ accounts: { register: async (a) => (seen.push(a), 'created') } })
    expect(await id.register({ name: 'A', email: 'a@x.io', password: 'court' })).toMatch(/8 caractères/)
    expect(await id.register({ name: ' Alice ', email: 'a@X.io', password: 'secret12' })).toBeNull()
    expect(seen).toEqual([{ name: 'Alice', email: 'a@X.io', domain: 'x.io', passwordHash: 'hash:secret12' }])
  })
  it('signale un email déjà pris', async () => {
    const id = setup({ accounts: { register: async () => 'email-taken' } })
    expect(await id.register({ name: 'A', email: 'a@x.io', password: 'secret12' })).toBe('Un compte existe déjà avec cet email.')
  })
})
