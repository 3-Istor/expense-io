// /metrics (T-0021) : format Prometheus, RED par opération, métier, USE ; aucune donnée de client dans les métriques.
// La route est hors du contrat client (docs/openapi.yaml) : ces tests ne touchent pas à la suite de contrat.
import { expect, test } from '@playwright/test'
import { closeDb, createCompany, createUser, login } from '../support/fixtures'

const PDF = { name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

test.afterAll(async () => {
  await closeDb()
})

/** Valeur d'une série, 0 si elle n'existe pas encore. */
function value(body: string, series: string): number {
  const line = body.split('\n').find((l) => l.startsWith(series + ' '))
  return line ? Number(line.slice(series.length + 1)) : 0
}

test('GET /metrics : format Prometheus, RED et métier comptent les appels', async ({ request, baseURL }) => {
  const company = await createCompany()
  const employee = await createUser(company, 'MetriquesEmploye', 'employee')
  const asEmployee = await login(baseURL!, employee)

  const before = await (await request.get('/metrics')).text()
  const listed = 'http_requests_total{operation="listMyExpenseNotes",status="200"}'
  const created = 'http_requests_total{operation="createExpenseNote",status="201"}'

  expect((await asEmployee.get('/api/expense-notes')).status()).toBe(200)
  const res = await asEmployee.post('/api/expense-notes', {
    multipart: { amount: '12.5', expenseDate: '2026-10-01', description: 'Métriques', receipt: PDF },
  })
  expect(res.status()).toBe(201)

  const scrape = await request.get('/metrics')
  expect(scrape.status()).toBe(200)
  expect(scrape.headers()['content-type']).toContain('text/plain')
  const body = await scrape.text()

  // RED : débit et erreurs par opération et code, durée en histogramme.
  expect(value(body, listed)).toBeGreaterThan(value(before, listed))
  expect(value(body, created)).toBeGreaterThan(value(before, created))
  expect(body).toContain('# TYPE http_request_duration_seconds histogram')
  expect(body).toMatch(/http_request_duration_seconds_bucket\{operation="createExpenseNote",le="\+Inf"\} \d+/)
  // Métier : la note soumise est comptée.
  expect(value(body, 'expense_notes_submitted_total')).toBeGreaterThan(value(before, 'expense_notes_submitted_total'))
  // USE : pool PostgreSQL et OCR.
  expect(body).toMatch(/db_pool_connections\{state="waiting"\} \d+/)
  expect(body).toMatch(/ocr_jobs\{state="running"\} \d+/)
  // Aucun identifiant d'utilisateur, de note ou d'entreprise.
  expect(body).not.toMatch(UUID)
  expect(body).not.toContain(company.domain)
  await asEmployee.dispose()
})
