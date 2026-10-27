// Matrice d'autorisations GÉNÉRÉE : chacune des 14 routes du contrat × chacun des 7 profils d'appelant, avec le code
// attendu écrit pour chaque case. Aucun cas n'est choisi à la main : un oubli de contrôle d'accès sur une route, pour
// un profil, fait échouer un test nommé « <route> en tant que <profil> ».
// Les scénarios métier détaillés restent dans authz.spec.ts ; ici, on vérifie que la grille est complète.
import { expect, test, type APIRequestContext } from '@playwright/test'
import { closeDb, createCompany, createNote, createUser, db, login, type TestUser } from '../support/fixtures'

type Actor = 'anonyme' | 'employé' | 'son manager' | 'autre manager' | 'RH' | 'manager autre entreprise' | 'RH autre entreprise'
const ACTORS: Actor[] = ['anonyme', 'employé', 'son manager', 'autre manager', 'RH', 'manager autre entreprise', 'RH autre entreprise']

interface World {
  users: Record<Exclude<Actor, 'anonyme'>, TestUser>
  clients: Record<Actor, APIRequestContext>
}
let w: World

const PDF = { name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }

/** Une case de la grille : la requête (avec ses données fraîches) et le code attendu pour chaque profil. */
interface Route {
  name: string
  call: (client: APIRequestContext, actor: Actor) => Promise<{ status: number; body?: unknown }>
  expected: Record<Actor, number>
  /** Vérification d'isolation supplémentaire sur une réponse 200 (aucune donnée d'un autre périmètre). */
  isolation?: (body: unknown, actor: Actor) => Promise<void>
}

const allow = (code: number, who: Actor[], denied: number, others = 404): Record<Actor, number> =>
  Object.fromEntries(ACTORS.map((a) => [a, who.includes(a) ? code : a === 'anonyme' ? denied : others])) as Record<Actor, number>
const forRole = (code: number, who: Actor[], denied: number): Record<Actor, number> =>
  Object.fromEntries(ACTORS.map((a) => [a, who.includes(a) ? code : denied])) as Record<Actor, number>

const managers: Actor[] = ['son manager', 'autre manager', 'manager autre entreprise']
const hrs: Actor[] = ['RH', 'RH autre entreprise']
const everyone = ACTORS.filter((a) => a !== 'anonyme')

// Note fraîche de l'employé (subordonné de « son manager ») et note fraîche de « son manager » (manager racine).
const employeeNote = () => createNote(w.users['employé'].id)
const managerNote = () => createNote(w.users['son manager'].id)
const json = async (res: { status(): number; json(): Promise<unknown> }) => ({ status: res.status(), body: await res.json().catch(() => undefined) })

const ROUTES: Route[] = [
  {
    name: 'GET /api/expense-notes',
    call: async (c) => json(await c.get('/api/expense-notes')),
    expected: forRole(200, everyone, 401),
    isolation: async (body, actor) => {
      const own = w.users[actor as Exclude<Actor, 'anonyme'>].id
      expect((body as { userId: string }[]).every((n) => n.userId === own), 'uniquement ses propres notes').toBe(true)
    },
  },
  {
    name: 'POST /api/expense-notes',
    call: async (c) => json(await c.post('/api/expense-notes', { multipart: { amount: '10', expenseDate: '2026-10-01', description: 'Matrice', receipt: PDF } })),
    expected: forRole(201, everyone, 401),
  },
  {
    name: 'GET /api/expense-notes/{id}/receipt-url',
    call: async (c) => json(await c.get(`/api/expense-notes/${await employeeNote()}/receipt-url`)),
    expected: allow(200, ['employé'], 401),
  },
  {
    name: 'POST /api/expense-notes/receipt-suggestion',
    call: async (c) => json(await c.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: PDF } })),
    expected: forRole(200, everyone, 401),
  },
  {
    name: 'GET /api/manager/expense-notes',
    call: async (c) => json(await c.get('/api/manager/expense-notes')),
    expected: forRole(200, managers, 401),
    isolation: async (body, actor) => {
      const ids = (body as { userId: string }[]).map((n) => n.userId)
      const team = actor === 'son manager' ? [w.users['employé'].id] : []
      expect(ids.every((id) => team.includes(id)), 'uniquement les subordonnés directs').toBe(true)
    },
  },
  ...(['approve', 'reject'] as const).map<Route>((action) => ({
    name: `POST /api/manager/expense-notes/{id}/${action}`,
    call: async (c) => json(await c.post(`/api/manager/expense-notes/${await employeeNote()}/${action}`)),
    expected: { ...forRole(404, managers, 401), 'son manager': 200 },
  })),
  {
    name: 'GET /api/manager/expense-notes/{id}/receipt-url',
    call: async (c) => json(await c.get(`/api/manager/expense-notes/${await employeeNote()}/receipt-url`)),
    expected: { ...forRole(404, managers, 401), 'son manager': 200 },
  },
  {
    name: 'GET /api/hr/expense-notes',
    call: async (c) => json(await c.get('/api/hr/expense-notes')),
    expected: forRole(200, hrs, 403),
    isolation: async (body, actor) => {
      const ids = (body as { userId: string }[]).map((n) => n.userId)
      const rootOfA = [w.users['son manager'].id, w.users['autre manager'].id]
      if (actor === 'RH') expect(ids.every((id) => rootOfA.includes(id)), 'auteurs sans manager de son entreprise').toBe(true)
      else expect(ids.some((id) => rootOfA.includes(id)), 'rien de l\'autre entreprise').toBe(false)
    },
  },
  ...(['approve', 'reject'] as const).map<Route>((action) => ({
    name: `POST /api/hr/expense-notes/{id}/${action}`,
    call: async (c) => json(await c.post(`/api/hr/expense-notes/${await managerNote()}/${action}`)),
    expected: { ...forRole(404, hrs, 403), RH: 200 },
  })),
  {
    name: 'GET /api/hr/expense-notes/{id}/receipt-url',
    call: async (c) => json(await c.get(`/api/hr/expense-notes/${await managerNote()}/receipt-url`)),
    expected: { ...forRole(404, hrs, 403), RH: 200 },
  },
  {
    name: 'GET /api/hr/users',
    call: async (c) => json(await c.get('/api/hr/users')),
    expected: forRole(200, hrs, 403),
    isolation: async (body, actor) => {
      const companyOf = async (id: string) => (await db().query('SELECT company_id FROM users WHERE id = $1', [id])).rows[0].company_id
      const mine = await companyOf(w.users[actor as Exclude<Actor, 'anonyme'>].id)
      for (const u of body as { id: string }[]) expect(await companyOf(u.id), 'même entreprise').toBe(mine)
    },
  },
  {
    name: 'PUT /api/hr/users/{id}/manager',
    call: async (c) => {
      const target = w.users['employé'].id
      const res = await json(await c.put(`/api/hr/users/${target}/manager`, { data: { managerId: w.users['son manager'].id } }))
      return res
    },
    expected: { ...forRole(404, hrs, 403), RH: 200 },
  },
]

test.beforeAll(async ({ baseURL }) => {
  const a = await createCompany()
  const b = await createCompany()
  const sonManager = await createUser(a, 'Manager', 'manager')
  const users = {
    'son manager': sonManager,
    'autre manager': await createUser(a, 'Manager2', 'manager'),
    employé: await createUser(a, 'Employe', 'employee', sonManager.id),
    RH: await createUser(a, 'Rh', 'hr_admin'),
    'manager autre entreprise': await createUser(b, 'ManagerB', 'manager'),
    'RH autre entreprise': await createUser(b, 'RhB', 'hr_admin'),
  }
  const { request } = await import('@playwright/test')
  const clients = { anonyme: await request.newContext({ baseURL }) } as Record<Actor, APIRequestContext>
  for (const [actor, user] of Object.entries(users)) clients[actor as Actor] = await login(baseURL!, user)
  w = { users, clients }
})

test.afterAll(async () => {
  await Promise.all(Object.values(w?.clients ?? {}).map((c) => c.dispose()))
  await closeDb()
})

for (const route of ROUTES) {
  test.describe(route.name, () => {
    for (const actor of ACTORS) {
      test(`en tant que ${actor} → ${route.expected[actor]}`, async () => {
        const res = await route.call(w.clients[actor], actor)
        expect(res.status).toBe(route.expected[actor])
        if (res.status === 200 && route.isolation) await route.isolation(res.body, actor)
      })
    }
  })
}

test('la grille couvre les 14 routes du contrat', async () => {
  const { parse } = await import('yaml')
  const { readFileSync } = await import('node:fs')
  const spec = parse(readFileSync('docs/openapi.yaml', 'utf8')) as { paths: Record<string, Record<string, unknown>> }
  const declared = Object.entries(spec.paths).flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`))
  expect(ROUTES.map((r) => r.name).sort()).toEqual(declared.sort())
})
