// Erreurs RFC 9457 par négociation de contenu (ADR 0005, contrat 1.1.0).
// Un client qui demande `application/problem+json` reçoit le format standard ; sans cette demande, le format
// historique `{ error }` reste identique (les tests de contract.spec.ts le prouvent sur toutes les routes).
import { randomUUID } from 'node:crypto'
import { expect, test as base, type APIRequestContext } from '@playwright/test'
import { closeDb, createCompany, createNote, createUser, expectError, login, type TestUser } from '../support/fixtures'
import { withContractCheck } from '../support/openapi'

const test = base.extend({ request: async ({ request }, provide) => provide(withContractCheck(request)) })
const PROBLEM = { accept: 'application/problem+json' }

let manager: TestUser, employee: TestUser
let asManager: APIRequestContext, asEmployee: APIRequestContext

test.beforeAll(async ({ baseURL }) => {
  const company = await createCompany()
  manager = await createUser(company, 'Manager', 'manager')
  employee = await createUser(company, 'Employe', 'employee', manager.id)
  asManager = withContractCheck(await login(baseURL!, manager))
  asEmployee = withContractCheck(await login(baseURL!, employee))
})

test.afterAll(async () => {
  await Promise.all([asManager.dispose(), asEmployee.dispose()])
  await closeDb()
})

async function expectProblem(res: Awaited<ReturnType<APIRequestContext['get']>>, status: number, type: string) {
  expect(res.status()).toBe(status)
  expect(res.headers()['content-type']).toMatch(/^application\/problem\+json/)
  const body = (await res.json()) as { title: unknown; detail: unknown; error: unknown }
  expect(body).toMatchObject({ type: `urn:expense-io:problem:${type}`, status })
  expect(typeof body.title).toBe('string')
  expect(body.detail).toBe(body.error) // `error` gardé pour les clients du format historique
  return body
}

test('401 sans session : problem+json si demandé, {error} sinon', async ({ request }) => {
  await expectProblem(await request.get('/api/expense-notes', { headers: PROBLEM }), 401, 'unauthenticated')
  const legacy = await request.get('/api/expense-notes')
  expect(legacy.headers()['content-type']).toMatch(/^application\/json/)
  expectError(await legacy.json())
})

test('403 sur une route RH sans le rôle', async () => {
  await expectProblem(await asEmployee.get('/api/hr/users', { headers: PROBLEM }), 403, 'forbidden')
})

test('404 pour une note inconnue', async () => {
  await expectProblem(await asEmployee.get(`/api/expense-notes/${randomUUID()}/receipt-url`, { headers: PROBLEM }), 404, 'not-found')
})

test('400 pour un formulaire incomplet', async () => {
  const res = await asEmployee.post('/api/expense-notes', { headers: PROBLEM, multipart: { amount: '12' } })
  await expectProblem(res, 400, 'invalid')
})

test('409 pour une note déjà décidée', async () => {
  const id = await createNote(employee.id, { status: 'approved' })
  await expectProblem(await asManager.post(`/api/manager/expense-notes/${id}/approve`, { headers: PROBLEM }), 409, 'conflict')
})

test('Accept avec plusieurs types : problem+json reconnu parmi d\'autres', async ({ request }) => {
  const res = await request.get('/api/expense-notes', { headers: { accept: 'application/json;q=0.9, application/problem+json' } })
  await expectProblem(res, 401, 'unauthenticated')
})
