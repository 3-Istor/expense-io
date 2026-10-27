// SEC-13 (T-0001) : le fichier d'un reçu est stocké sous une clé opaque. L'API garde `receiptKey` au format d'origine
// (contrat) ; l'URL signée pointe vers la clé opaque, jamais vers une clé qui se déduit du compteur.
import { expect, test, type APIRequestContext } from '@playwright/test'
import { closeDb, createCompany, createUser, db, login } from '../support/fixtures'
import { withContractCheck } from '../support/openapi'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const UUID_KEY = /receipts\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png/

let asEmployee: APIRequestContext

test.beforeAll(async ({ baseURL }) => {
  const company = await createCompany()
  const employee = await createUser(company, 'Employe', 'employee')
  asEmployee = withContractCheck(await login(baseURL!, employee))
})
test.afterAll(closeDb)

async function createNote(): Promise<{ id: string; receiptKey: string }> {
  const multipart = { amount: '12', expenseDate: '2026-10-01', description: 'Taxi', receipt: { name: 'r.png', mimeType: 'image/png', buffer: PNG_1x1 } }
  const res = await asEmployee.post('/api/expense-notes', { multipart })
  expect(res.status()).toBe(201)
  return res.json()
}

test('SEC-13 : receiptKey garde le format du contrat, le fichier est sous une clé opaque', async () => {
  const note = await createNote()
  expect(note.receiptKey).toMatch(/^receipts\/\d+\.png$/)
  const { url } = await (await asEmployee.get(`/api/expense-notes/${note.id}/receipt-url`)).json()
  expect(decodeURIComponent(url)).toMatch(UUID_KEY)
  expect(decodeURIComponent(url)).not.toContain(note.receiptKey)
  const stored = await db().query('SELECT storage_key FROM expense_notes WHERE id = $1', [note.id])
  expect(decodeURIComponent(url)).toContain(stored.rows[0].storage_key)
})

test('SEC-13 : deux notes consécutives ont des clés de stockage sans lien', async () => {
  const [a, b] = [await createNote(), await createNote()]
  const keys = await db().query('SELECT storage_key FROM expense_notes WHERE id = ANY($1) ORDER BY created_at', [[a.id, b.id]])
  const [ka, kb] = keys.rows.map((r) => r.storage_key as string)
  expect(ka).toMatch(UUID_KEY)
  expect(kb).toMatch(UUID_KEY)
  expect(ka).not.toBe(kb)
})

test('une note créée avant SEC-13 (sans clé de stockage) garde son reçu lisible', async () => {
  const note = await createNote()
  await db().query('UPDATE expense_notes SET storage_key = NULL WHERE id = $1', [note.id])
  const res = await asEmployee.get(`/api/expense-notes/${note.id}/receipt-url`)
  expect(res.status()).toBe(200)
  expect(decodeURIComponent((await res.json()).url)).toContain(note.receiptKey)
})
