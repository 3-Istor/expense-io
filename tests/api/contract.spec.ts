// Tests de caractérisation du contrat (tâche 1.3) : ils figent le comportement ACTUEL des 14 endpoints de
// docs/contract.md (codes HTTP et formats JSON). Ils doivent rester verts pendant toute la refactorisation.
// Les failles d'autorisation ne sont pas testées ici : elles sont dans la matrice d'autorisations (tâche 1.4).
import { randomUUID } from 'node:crypto'
import { expect, test as base, type APIRequestContext } from '@playwright/test'
import {
  closeDb,
  createCompany,
  createNote,
  createUser,
  db,
  expectError,
  expectNote,
  expectUser,
  login,
  type TestUser,
} from '../support/fixtures'
import { uncovered, withContractCheck } from '../support/openapi'

// Toute réponse, avec ou sans session, est validée contre docs/openapi.yaml (tâche 1.5).
const test = base.extend({ request: async ({ request }, provide) => provide(withContractCheck(request)) })

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const png = (name = 'recu.png') => ({ name, mimeType: 'image/png', buffer: PNG_1x1 })

let hr: TestUser, manager: TestUser, employee: TestUser, otherEmployee: TestUser
let asHr: APIRequestContext, asManager: APIRequestContext, asEmployee: APIRequestContext

test.beforeAll(async ({ baseURL }) => {
  const company = await createCompany()
  hr = await createUser(company, 'Rh', 'hr_admin')
  manager = await createUser(company, 'Manager', 'manager')
  employee = await createUser(company, 'Employe', 'employee', manager.id)
  otherEmployee = await createUser(company, 'Autre', 'employee')
  asHr = withContractCheck(await login(baseURL!, hr))
  asManager = withContractCheck(await login(baseURL!, manager))
  asEmployee = withContractCheck(await login(baseURL!, employee))
})

test.afterAll(async () => {
  // Couverture du contrat : chaque code documenté (hors 500) de chaque opération a été exercé au moins une fois.
  expect(uncovered()).toEqual([])
  await Promise.all([asHr?.dispose(), asManager?.dispose(), asEmployee?.dispose()])
  await closeDb()
})

test.describe('GET /api/expense-notes', () => {
  test('sans session : 401 {error}', async ({ request }) => {
    const res = await request.get('/api/expense-notes')
    expect(res.status()).toBe(401)
    expectError(await res.json())
  })

  test('200 : uniquement les notes de l\'appelant, plus récentes d\'abord', async () => {
    const first = await createNote(employee.id, { description: 'premiere' })
    const second = await createNote(employee.id, { description: 'seconde' })
    await createNote(manager.id)
    const res = await asEmployee.get('/api/expense-notes')
    expect(res.status()).toBe(200)
    const notes = await res.json()
    expect(Array.isArray(notes)).toBe(true)
    notes.forEach(expectNote)
    expect(notes.every((n: { userId: string }) => n.userId === employee.id)).toBe(true)
    const ids = notes.map((n: { id: string }) => n.id)
    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first))
  })
})

test.describe('GET /api/expense-notes?sort', () => {
  test('200 : tri autorisé appliqué (montant croissant)', async () => {
    await createNote(employee.id, { amount: 99 })
    await createNote(employee.id, { amount: 1 })
    const res = await asEmployee.get('/api/expense-notes?sort=amount%20asc')
    expect(res.status()).toBe(200)
    const amounts = ((await res.json()) as { amount: number }[]).map((n) => n.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })

  test('400 : tri hors liste (ADR 0003)', async () => {
    for (const sort of ['colonne_inexistante', 'amount; DROP TABLE users', '(SELECT 1)']) {
      const res = await asEmployee.get(`/api/expense-notes?sort=${encodeURIComponent(sort)}`)
      expect(res.status(), sort).toBe(400)
      expectError(await res.json())
    }
  })
})

test.describe('POST /api/expense-notes', () => {
  const valid = () => ({ amount: '42.50', expenseDate: '2026-10-01', description: 'Taxi', receipt: png() })

  test('sans session : 401 {error}', async ({ request }) => {
    const res = await request.post('/api/expense-notes', { multipart: valid() })
    expect(res.status()).toBe(401)
    expectError(await res.json())
  })

  test('201 : renvoie la note créée, en attente', async () => {
    const res = await asEmployee.post('/api/expense-notes', { multipart: valid() })
    expect(res.status()).toBe(201)
    const note = await res.json()
    expectNote(note)
    expect(note).toMatchObject({ userId: employee.id, amount: 42.5, expenseDate: '2026-10-01', status: 'pending' })
    expect(note.receiptKey).toMatch(/^receipts\/\d+\.png$/)
  })

  test('400 : champ manquant ou montant invalide', async () => {
    for (const multipart of [
      { ...valid(), description: '  ' },
      { ...valid(), amount: '-3' },
      { amount: '10', expenseDate: '2026-10-01', description: 'Sans reçu' },
    ]) {
      const res = await asEmployee.post('/api/expense-notes', { multipart })
      expect(res.status()).toBe(400)
      expectError(await res.json())
    }
  })

  test('400 : type de reçu non autorisé', async () => {
    const receipt = { name: 'recu.txt', mimeType: 'text/plain', buffer: Buffer.from('bonjour') }
    const res = await asEmployee.post('/api/expense-notes', { multipart: { ...valid(), receipt } })
    expect(res.status()).toBe(400)
    expectError(await res.json())
  })

  test('400 : reçu de plus de 10 Mo', async () => {
    const receipt = { name: 'gros.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }
    const res = await asEmployee.post('/api/expense-notes', { multipart: { ...valid(), receipt } })
    expect(res.status()).toBe(400)
    expectError(await res.json())
  })
})

test.describe('GET /api/expense-notes/{id}/receipt-url', () => {
  test('sans session : 401', async ({ request }) => {
    const res = await request.get(`/api/expense-notes/${randomUUID()}/receipt-url`)
    expect(res.status()).toBe(401)
  })

  test('200 {url} pour sa propre note', async () => {
    const id = await createNote(employee.id)
    const res = await asEmployee.get(`/api/expense-notes/${id}/receipt-url`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(['url'])
    expect(body.url).toMatch(/^https?:\/\//)
  })

  test('404 pour la note d\'un autre ou une note inconnue', async () => {
    const othersNote = await createNote(manager.id)
    for (const id of [othersNote, randomUUID()]) {
      const res = await asEmployee.get(`/api/expense-notes/${id}/receipt-url`)
      expect(res.status()).toBe(404)
      expectError(await res.json())
    }
  })
})

test.describe('POST /api/expense-notes/receipt-suggestion', () => {
  test('sans session : 401', async ({ request }) => {
    const res = await request.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: png() } })
    expect(res.status()).toBe(401)
  })

  test('400 sans fichier', async () => {
    const res = await asEmployee.post('/api/expense-notes/receipt-suggestion', { multipart: { autre: 'x' } })
    expect(res.status()).toBe(400)
    expectError(await res.json())
  })

  test('200 : suggestion avec au plus amount et expenseDate', async () => {
    const pdf = { name: 'recu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }
    for (const receipt of [pdf, png()]) {
      const res = await asEmployee.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt } })
      expect(res.status()).toBe(200)
      const body = await res.json()
      for (const key of Object.keys(body)) expect(['amount', 'expenseDate']).toContain(key)
    }
  })
})

test.describe('GET /api/manager/expense-notes', () => {
  test('sans session ou sans rôle manager : 401', async ({ request }) => {
    expect((await request.get('/api/manager/expense-notes')).status()).toBe(401)
    const res = await asEmployee.get('/api/manager/expense-notes')
    expect(res.status()).toBe(401)
    expectError(await res.json())
  })

  test('200 : notes en attente des subordonnés, plus anciennes d\'abord', async () => {
    const pending = await createNote(employee.id)
    const decided = await createNote(employee.id, { status: 'approved' })
    const own = await createNote(manager.id)
    const res = await asManager.get('/api/manager/expense-notes')
    expect(res.status()).toBe(200)
    const notes = await res.json()
    notes.forEach(expectNote)
    const ids = notes.map((n: { id: string }) => n.id)
    expect(ids).toContain(pending)
    expect(ids).not.toContain(decided)
    expect(ids).not.toContain(own)
    expect(notes.every((n: { status: string }) => n.status === 'pending')).toBe(true)
  })
})

for (const action of ['approve', 'reject'] as const) {
  const expected = action === 'approve' ? 'approved' : 'rejected'

  test.describe(`POST /api/manager/expense-notes/{id}/${action}`, () => {
    test('sans session ou sans rôle manager : 401', async ({ request }) => {
      const id = await createNote(employee.id)
      expect((await request.post(`/api/manager/expense-notes/${id}/${action}`)).status()).toBe(401)
      expect((await asEmployee.post(`/api/manager/expense-notes/${id}/${action}`)).status()).toBe(401)
    })

    test(`200 puis 409 : la note d'un subordonné passe à "${expected}" une seule fois`, async () => {
      const id = await createNote(employee.id)
      const res = await asManager.post(`/api/manager/expense-notes/${id}/${action}`)
      expect(res.status()).toBe(200)
      const note = await res.json()
      expectNote(note)
      expect(note).toMatchObject({ id, status: expected })
      const again = await asManager.post(`/api/manager/expense-notes/${id}/${action}`)
      expect(again.status()).toBe(409)
      expectError(await again.json())
    })

    test('404 : note hors de son équipe ou inconnue', async () => {
      const outside = await createNote(otherEmployee.id)
      for (const id of [outside, randomUUID()]) {
        const res = await asManager.post(`/api/manager/expense-notes/${id}/${action}`)
        expect(res.status()).toBe(404)
        expectError(await res.json())
      }
    })
  })

  test.describe(`POST /api/hr/expense-notes/{id}/${action}`, () => {
    test('sans session ou sans rôle hr_admin : 403', async ({ request }) => {
      const id = await createNote(manager.id)
      expect((await request.post(`/api/hr/expense-notes/${id}/${action}`)).status()).toBe(403)
      const res = await asManager.post(`/api/hr/expense-notes/${id}/${action}`)
      expect(res.status()).toBe(403)
      expectError(await res.json())
    })

    test(`200 puis 409 : la note d'un manager racine passe à "${expected}" une seule fois`, async () => {
      const id = await createNote(manager.id)
      const res = await asHr.post(`/api/hr/expense-notes/${id}/${action}`)
      expect(res.status()).toBe(200)
      const note = await res.json()
      expectNote(note)
      expect(note).toMatchObject({ id, status: expected })
      const again = await asHr.post(`/api/hr/expense-notes/${id}/${action}`)
      expect(again.status()).toBe(409)
      expectError(await again.json())
    })

    test('404 : note d\'un employé ou note inconnue', async () => {
      const employeeNote = await createNote(employee.id)
      for (const id of [employeeNote, randomUUID()]) {
        const res = await asHr.post(`/api/hr/expense-notes/${id}/${action}`)
        expect(res.status()).toBe(404)
        expectError(await res.json())
      }
    })
  })
}

test.describe('GET /api/manager/expense-notes/{id}/receipt-url', () => {
  test('sans session ou sans rôle manager : 401', async ({ request }) => {
    const id = await createNote(employee.id)
    expect((await request.get(`/api/manager/expense-notes/${id}/receipt-url`)).status()).toBe(401)
    expect((await asEmployee.get(`/api/manager/expense-notes/${id}/receipt-url`)).status()).toBe(401)
  })

  test('200 {url} pour la note d\'un subordonné, 404 pour une note inconnue', async () => {
    const id = await createNote(employee.id)
    const res = await asManager.get(`/api/manager/expense-notes/${id}/receipt-url`)
    expect(res.status()).toBe(200)
    expect(Object.keys(await res.json())).toEqual(['url'])
    const missing = await asManager.get(`/api/manager/expense-notes/${randomUUID()}/receipt-url`)
    expect(missing.status()).toBe(404)
    expectError(await missing.json())
  })
})

test.describe('GET /api/hr/expense-notes', () => {
  test('sans session ou sans rôle hr_admin : 403', async ({ request }) => {
    expect((await request.get('/api/hr/expense-notes')).status()).toBe(403)
    const res = await asEmployee.get('/api/hr/expense-notes')
    expect(res.status()).toBe(403)
    expectError(await res.json())
  })

  test('200 : notes en attente des managers racine de l\'entreprise', async () => {
    const rootNote = await createNote(manager.id)
    const employeeNote = await createNote(employee.id)
    const decided = await createNote(manager.id, { status: 'rejected' })
    const res = await asHr.get('/api/hr/expense-notes')
    expect(res.status()).toBe(200)
    const notes = await res.json()
    notes.forEach(expectNote)
    const ids = notes.map((n: { id: string }) => n.id)
    expect(ids).toContain(rootNote)
    expect(ids).not.toContain(employeeNote)
    expect(ids).not.toContain(decided)
  })
})

test.describe('GET /api/hr/expense-notes/{id}/receipt-url', () => {
  test('sans session ou sans rôle hr_admin : 403', async ({ request }) => {
    const id = await createNote(manager.id)
    expect((await request.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(403)
    expect((await asManager.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(403)
  })

  test('200 {url} pour la note d\'un manager racine, 404 pour celle d\'un employé', async () => {
    const id = await createNote(manager.id)
    const res = await asHr.get(`/api/hr/expense-notes/${id}/receipt-url`)
    expect(res.status()).toBe(200)
    expect(Object.keys(await res.json())).toEqual(['url'])
    const employeeNote = await createNote(employee.id)
    const notFound = await asHr.get(`/api/hr/expense-notes/${employeeNote}/receipt-url`)
    expect(notFound.status()).toBe(404)
    expectError(await notFound.json())
  })
})

test.describe('GET /api/hr/users', () => {
  test('sans session ou sans rôle hr_admin : 403', async ({ request }) => {
    expect((await request.get('/api/hr/users')).status()).toBe(403)
    const res = await asManager.get('/api/hr/users')
    expect(res.status()).toBe(403)
    expectError(await res.json())
  })

  test('200 : employés et managers de l\'entreprise, triés par nom, sans les RH', async () => {
    const res = await asHr.get('/api/hr/users')
    expect(res.status()).toBe(200)
    const users = await res.json()
    users.forEach(expectUser)
    expect(users.map((u: { id: string }) => u.id).sort()).toEqual(
      [manager.id, employee.id, otherEmployee.id].sort(),
    )
    const names = users.map((u: { name: string }) => u.name)
    expect(names).toEqual([...names].sort())
    expect(users.find((u: { id: string }) => u.id === employee.id)).toMatchObject({
      email: employee.email,
      role: 'employee',
      managerId: manager.id,
    })
  })
})

test.describe('PUT /api/hr/users/{id}/manager', () => {
  test('sans session ou sans rôle hr_admin : 403', async ({ request }) => {
    const url = `/api/hr/users/${otherEmployee.id}/manager`
    expect((await request.put(url, { data: { managerId: manager.id } })).status()).toBe(403)
    const res = await asManager.put(url, { data: { managerId: manager.id } })
    expect(res.status()).toBe(403)
    expectError(await res.json())
  })

  test('200 : rattache puis détache un employé', async () => {
    const url = `/api/hr/users/${otherEmployee.id}/manager`
    const attached = await asHr.put(url, { data: { managerId: manager.id } })
    expect(attached.status()).toBe(200)
    const user = await attached.json()
    expectUser(user)
    expect(user).toMatchObject({ id: otherEmployee.id, managerId: manager.id })
    const detached = await asHr.put(url, { data: { managerId: null } })
    expect(detached.status()).toBe(200)
    expect(await detached.json()).toMatchObject({ id: otherEmployee.id, managerId: null })
  })

  test('400 : corps illisible ou managerId invalide (ADR 0002)', async () => {
    const url = `/api/hr/users/${otherEmployee.id}/manager`
    for (const data of ['{ pas du json', { autre: 1 }, { managerId: 'pas-un-uuid' }, { managerId: 42 }]) {
      const res = await asHr.put(url, { headers: { 'content-type': 'application/json' }, data })
      expect(res.status(), JSON.stringify(data)).toBe(400)
      expectError(await res.json())
    }
  })

  test('404 : utilisateur inconnu', async () => {
    const res = await asHr.put(`/api/hr/users/${randomUUID()}/manager`, { data: { managerId: null } })
    expect(res.status()).toBe(404)
    expectError(await res.json())
  })

  test('409 : manager égal à soi-même ou qui n\'est pas manager', async () => {
    for (const managerId of [otherEmployee.id, employee.id]) {
      const res = await asHr.put(`/api/hr/users/${otherEmployee.id}/manager`, { data: { managerId } })
      expect(res.status()).toBe(409)
      expectError(await res.json())
    }
    const after = await db().query('SELECT manager_id FROM users WHERE id = $1', [otherEmployee.id])
    expect(after.rows[0].manager_id).toBeNull()
  })
})
