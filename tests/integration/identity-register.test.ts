// Inscription contre la vraie base (server action, hors du contrat HTTP) : le premier inscrit d'un domaine devient RH,
// les suivants employés de la même entreprise ; un email déjà pris n'insère rien. Comportement actuel (SEC-15).
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, expect, it } from 'vitest'
import { TEST_ENV } from '../support/env'

process.env.DATABASE_URL ??= TEST_ENV.DATABASE_URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
afterAll(async () => {
  await pool.end()
  await global.__pgPool?.end()
})

it('inscription par domaine : premier inscrit RH, suivants employés, email unique', async () => {
  const { identity } = await import('@/modules/identity')
  const domain = `r${randomUUID().slice(0, 8)}.test`
  const register = (name: string) => identity.register({ name, email: `${name}@${domain}`, password: 'motdepasse' })

  expect(await register('premier')).toBeNull()
  expect(await register('second')).toBeNull()
  expect(await register('premier')).toBe('Un compte existe déjà avec cet email.')

  const { rows } = await pool.query(
    `SELECT u.email, u.role, c.email_domain FROM users u JOIN companies c ON c.id = u.company_id
     WHERE c.email_domain = $1 ORDER BY u.email`,
    [domain],
  )
  expect(rows).toEqual([
    { email: `premier@${domain}`, role: 'hr_admin', email_domain: domain },
    { email: `second@${domain}`, role: 'employee', email_domain: domain },
  ])
})
