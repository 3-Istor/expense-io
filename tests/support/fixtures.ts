// Données de test : chaque fichier de tests crée sa propre entreprise (domaine unique) pour ne dépendre ni
// du seed ni des autres tests. Les lignes sont écrites directement en base, les appels passent par l'API.
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test'
import { TEST_ENV } from './env'

const PASSWORD = 'test-password'
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4)

export type Role = 'employee' | 'manager' | 'hr_admin'
export interface TestUser {
  id: string
  email: string
  name: string
  role: Role
}

let pool: Pool | undefined
export function db(): Pool {
  pool ??= new Pool({ connectionString: TEST_ENV.DATABASE_ADMIN_URL, max: 4 })
  return pool
}
export async function closeDb(): Promise<void> {
  await pool?.end()
  pool = undefined
}

export async function createCompany(): Promise<{ id: string; domain: string }> {
  const domain = `c${randomUUID().slice(0, 8)}.test`
  const res = await db().query('INSERT INTO companies (name, email_domain) VALUES ($1, $2) RETURNING id', [
    domain.split('.')[0],
    domain,
  ])
  return { id: res.rows[0].id, domain }
}

export async function createUser(
  company: { id: string; domain: string },
  name: string,
  role: Role,
  managerId: string | null = null,
): Promise<TestUser> {
  const email = `${name.toLowerCase()}@${company.domain}`
  const res = await db().query(
    `INSERT INTO users (company_id, name, email, password_hash, role, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [company.id, name, email, PASSWORD_HASH, role, managerId],
  )
  return { id: res.rows[0].id, email, name, role }
}

export async function createNote(
  userId: string,
  opts: { status?: 'pending' | 'approved' | 'rejected'; amount?: number; description?: string } = {},
): Promise<string> {
  const res = await db().query(
    `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, status)
     VALUES ($1, $2, '2026-10-01', $3, 'receipts/test.png', $4) RETURNING id`,
    [userId, opts.amount ?? 12.5, opts.description ?? 'Note de test', opts.status ?? 'pending'],
  )
  return res.rows[0].id
}

/** Ouvre une session Auth.js (provider credentials) et renvoie un client HTTP qui porte le cookie. */
export async function login(baseURL: string, user: TestUser): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL })
  const { csrfToken } = await (await ctx.get('/api/auth/csrf')).json()
  const res = await ctx.post('/api/auth/callback/credentials', {
    form: { csrfToken, email: user.email, password: PASSWORD, callbackUrl: '/' },
    maxRedirects: 0,
  })
  expect(res.status(), `connexion de ${user.email}`).toBe(302)
  const session = await (await ctx.get('/api/auth/session')).json()
  expect(session?.user?.id, `session de ${user.email}`).toBe(user.id)
  return ctx
}

// Formats du contrat (docs/contract.md). Clés exactes : un champ en plus ou en moins fait échouer le test.
export function expectNote(body: unknown): void {
  expect(Object.keys(body as object).sort()).toEqual(
    ['amount', 'category', 'createdAt', 'description', 'expenseDate', 'id', 'receiptKey', 'status', 'userId'].sort(),
  )
  const note = body as Record<string, unknown>
  expect(note.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(note.userId).toMatch(/^[0-9a-f-]{36}$/)
  expect(typeof note.amount).toBe('number')
  expect(note.expenseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(typeof note.description).toBe('string')
  expect(typeof note.receiptKey).toBe('string')
  expect(['pending', 'approved', 'rejected']).toContain(note.status)
  expect(new Date(note.createdAt as string).toISOString()).toBe(note.createdAt)
}

export function expectUser(body: unknown): void {
  expect(Object.keys(body as object).sort()).toEqual(['email', 'id', 'managerId', 'name', 'role'])
}

export function expectError(body: unknown): void {
  expect(Object.keys(body as object)).toEqual(['error'])
  expect(typeof (body as { error: unknown }).error).toBe('string')
}
