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
  it('409 si le corps est invalide (SEC-09, contrat inchangé) ou si on se rattache à soi-même', async () => {
    for (const body of [undefined, {}, { managerId: 'x' }, { managerId: 3 }, [uuid]]) {
      expect(await kindOf(setup().assignManager(hr, 'cible', body))).toBe('conflict')
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

describe('email d\'inscription (Sonar S8786 : pas de ReDoS)', () => {
  it('garde exactement les règles d\'avant', async () => {
    const { emailDomain } = await import('@/modules/identity/domain/user')
    const before = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/ // ancienne expression, comme référence
    const cases = ['a@x.io', 'a@X.IO', 'a@x.', 'a@.x', 'a@x', 'a b@x.io', 'a@@x.io', '@x.io', 'a@x..io', 'a@sub.x.io', 'a@.x.y']
    for (const email of cases) {
      expect(emailDomain(email), email).toBe(before.exec(email)?.[1].toLowerCase() ?? null)
    }
  })
  it('reste instantanée sur une entrée piégée', async () => {
    const { emailDomain } = await import('@/modules/identity/domain/user')
    const started = performance.now()
    emailDomain(`a@${'a.'.repeat(50_000)}@`)
    expect(performance.now() - started).toBeLessThan(100)
  })
})

describe('cas d\'usage identity : messages du contrat et délégation (tests de mutation)', () => {
  it('annuaire réservé au RH, renvoie le dépôt', async () => {
    const users = [{ id: 'u', name: 'A', email: 'a@x.io', role: 'employee' as const, managerId: null }]
    const id = setup({ users: { listDirectory: async () => users } })
    expect(await id.directory(hr)).toBe(users)
    expect(await kindOf(id.directory({ userId: 'e', role: 'employee' }))).toBe('denied')
  })
  it('messages exacts : « Invalid manager »', async () => {
    const message = (p: Promise<unknown>) => p.then(() => 'ok', (e: Error) => e.message)
    expect(await message(setup().assignManager(hr, 'cible', {}))).toBe('Invalid manager')
    expect(await message(setup().assignManager(hr, uuid, { managerId: uuid }))).toBe('Invalid manager')
    const refused = setup({ users: { assignManager: async () => ({ ok: false, reason: 'invalid-manager' }) } })
    expect(await message(refused.assignManager(hr, 'cible', { managerId: null }))).toBe('Invalid manager')
  })
  it('renvoie l\'utilisateur rattaché', async () => {
    const user = { id: 'cible', name: 'A', email: 'a@x.io', role: 'employee' as const, managerId: null }
    const id = setup({ users: { assignManager: async () => ({ ok: true, user }) } })
    expect(await id.assignManager(hr, 'cible', { managerId: null })).toBe(user)
  })
  it('refuse des identifiants vides ou du mauvais type sans consulter les comptes', async () => {
    let lookups = 0
    const id = setup({ accounts: { findByEmail: async () => (lookups++, null) } })
    for (const [email, password] of [['', 'x'], ['a@x.io', ''], [42, 'x'], ['a@x.io', 42]] as const) {
      expect(await id.verifyCredentials(email, password)).toBeNull()
    }
    expect(lookups).toBe(0)
  })
  it('relit le rôle courant dans le dépôt de comptes', async () => {
    const id = setup({ accounts: { roleOf: async (userId) => (userId === 'u1' ? 'manager' : null) } })
    expect(await id.currentRole('u1')).toBe('manager')
    expect(await id.currentRole('inconnu')).toBeNull()
  })
})
