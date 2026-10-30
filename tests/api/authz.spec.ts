// Matrice d'autorisations (tâche 1.4) : deux entreprises, et les règles métier du cours.
// - tout le monde crée et consulte SES notes ;
// - un manager ne décide que des notes de ses subordonnés directs ;
// - le RH décide des notes de tout auteur sans manager de SON entreprise (T-0014), jamais des siennes ;
// - rien ne traverse la frontière entre entreprises.
//
// Les scénarios qui révèlent une faille sont marqués `test.fail` avec la référence SEC-NN (= correctif n° NN du
// document de vision). Ils décrivent le comportement ATTENDU : ils échouent aujourd'hui, et le correctif de la
// phase 2 retire le `test.fail`. Liste et preuves : docs/audit/avant/authz.md.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { encode } from 'next-auth/jwt'
import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test'
import { Pool, type PoolClient } from 'pg'
import { closeDb, createCompany, createNote, createUser, db, login, type TestUser } from '../support/fixtures'
import { TEST_ENV } from '../support/env'

interface Company {
  hr: TestUser
  hr2: TestUser
  manager: TestUser // manager racine
  manager2: TestUser // second manager racine, avec sa propre équipe
  employee: TestUser // rattaché à manager
  employee2: TestUser // rattaché à manager2
  orphan: TestUser // employé sans manager
}

let A: Company, B: Company
const as: Record<string, APIRequestContext> = {}

async function makeCompany(): Promise<Company> {
  const c = await createCompany()
  const manager = await createUser(c, 'Manager', 'manager')
  const manager2 = await createUser(c, 'Manager2', 'manager')
  return {
    hr: await createUser(c, 'Rh', 'hr_admin'),
    hr2: await createUser(c, 'Rh2', 'hr_admin'),
    manager,
    manager2,
    employee: await createUser(c, 'Employe', 'employee', manager.id),
    employee2: await createUser(c, 'Employe2', 'employee', manager2.id),
    orphan: await createUser(c, 'Orphelin', 'employee'),
  }
}

test.beforeAll(async ({ baseURL }) => {
  A = await makeCompany()
  B = await makeCompany()
  for (const [key, user] of Object.entries({
    hrA: A.hr,
    hr2A: A.hr2,
    managerA: A.manager,
    employeeA: A.employee,
    orphanA: A.orphan,
    hrB: B.hr,
    managerB: B.manager,
  })) {
    as[key] = await login(baseURL!, user)
  }
})

test.afterAll(async () => {
  await Promise.all(Object.values(as).map((ctx) => ctx.dispose()))
  await closeDb()
})

const ids = async (res: { json(): Promise<unknown> }) => ((await res.json()) as { id: string }[]).map((n) => n.id)

// ---------------------------------------------------------------- Règles respectées aujourd'hui (garde-fous)

test('T01 tout le monde peut créer une note (employé, employé sans manager, manager, RH)', async () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  for (const who of ['employeeA', 'orphanA', 'managerA', 'hrA']) {
    const res = await as[who].post('/api/expense-notes', {
      multipart: {
        amount: '10',
        expenseDate: '2026-10-01',
        description: `T01 ${who}`,
        receipt: { name: 'r.png', mimeType: 'image/png', buffer: PNG },
      },
    })
    expect(res.status(), who).toBe(201)
  }
})

test('T02 on ne voit et ne lit que ses propres notes, y compris entre entreprises', async () => {
  const mine = await createNote(A.employee.id)
  const colleague = await createNote(A.employee2.id)
  const otherCompany = await createNote(B.employee.id)
  const list = await ids(await as.employeeA.get('/api/expense-notes'))
  expect(list).toContain(mine)
  expect(list).not.toContain(colleague)
  expect(list).not.toContain(otherCompany)
  for (const id of [colleague, otherCompany]) {
    expect((await as.employeeA.get(`/api/expense-notes/${id}/receipt-url`)).status()).toBe(404)
  }
})

test('T03 un manager ne voit que les notes en attente de SES subordonnés', async () => {
  const team = await createNote(A.employee.id)
  const otherTeam = await createNote(A.employee2.id)
  const orphan = await createNote(A.orphan.id)
  const otherCompany = await createNote(B.employee.id)
  const list = await ids(await as.managerA.get('/api/manager/expense-notes'))
  expect(list).toContain(team)
  for (const id of [otherTeam, orphan, otherCompany]) expect(list).not.toContain(id)
})

test('T04 un manager décide des notes de ses subordonnés', async () => {
  const id = await createNote(A.employee.id)
  expect((await as.managerA.post(`/api/manager/expense-notes/${id}/approve`)).status()).toBe(200)
})

test('T05 un manager ne décide pas des notes hors de son équipe (même entreprise)', async () => {
  for (const owner of [A.employee2, A.orphan, A.manager2, A.hr]) {
    const id = await createNote(owner.id)
    for (const action of ['approve', 'reject']) {
      const res = await as.managerA.post(`/api/manager/expense-notes/${id}/${action}`)
      expect(res.status(), `${action} note de ${owner.name}`).toBe(404)
    }
  }
})

test('T06 un manager ne décide pas des notes d\'une autre entreprise', async () => {
  const id = await createNote(B.employee.id)
  expect((await as.managerA.post(`/api/manager/expense-notes/${id}/approve`)).status()).toBe(404)
})

test('T07 personne ne valide sa propre note (manager, RH)', async () => {
  const managerNote = await createNote(A.manager.id)
  expect((await as.managerA.post(`/api/manager/expense-notes/${managerNote}/approve`)).status()).toBe(404)
  const hrNote = await createNote(A.hr.id)
  expect((await as.hrA.post(`/api/hr/expense-notes/${hrNote}/approve`)).status()).toBe(404)
  // Le RH ne voit ni ne décide sa propre note, même sans manager au-dessus de lui (T-0014).
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).not.toContain(hrNote)
})

test('T08 la note d\'un employé sans manager revient au RH de son entreprise (T-0014)', async () => {
  const id = await createNote(A.orphan.id)
  expect(await ids(await as.managerA.get('/api/manager/expense-notes'))).not.toContain(id)
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).toContain(id)
  expect((await as.hrA.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(200)
  expect((await as.hrA.post(`/api/hr/expense-notes/${id}/approve`)).status()).toBe(200)
  // Un autre RH de l'entreprise peut aussi la voir ; une fois décidée, elle sort des listes.
  expect(await ids(await as.hr2A.get('/api/hr/expense-notes'))).not.toContain(id)
})

test('T08b la note d\'un RH sans RH au-dessus est validée par un autre RH, jamais par lui-même (T-0014)', async () => {
  const hr2Note = await createNote(A.hr2.id)
  expect(await ids(await as.hr2A.get('/api/hr/expense-notes'))).not.toContain(hr2Note)
  expect((await as.hr2A.post(`/api/hr/expense-notes/${hr2Note}/approve`)).status()).toBe(404)
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).toContain(hr2Note)
  expect((await as.hrA.post(`/api/hr/expense-notes/${hr2Note}/reject`)).status()).toBe(200)
})

test('T08d la note d\'un employé qui a un manager reste à son manager : le RH n\'y accède pas (T-0014)', async () => {
  const id = await createNote(A.employee.id)
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).not.toContain(id)
  expect((await as.hrA.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(404)
  for (const action of ['approve', 'reject']) {
    expect((await as.hrA.post(`/api/hr/expense-notes/${id}/${action}`)).status()).toBe(404)
  }
})

test('T08c le RH d\'une autre entreprise ne voit pas les auteurs sans manager de A (T-0014)', async () => {
  const orphanNote = await createNote(A.orphan.id)
  const hrNote = await createNote(A.hr2.id)
  for (const id of [orphanNote, hrNote]) {
    expect(await ids(await as.hrB.get('/api/hr/expense-notes'))).not.toContain(id)
    expect((await as.hrB.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(404)
    expect((await as.hrB.post(`/api/hr/expense-notes/${id}/approve`)).status()).toBe(404)
  }
})

test('T09 le RH voit et décide des notes des managers racine de son entreprise', async () => {
  const id = await createNote(A.manager2.id)
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).toContain(id)
  expect((await as.hrA.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(200)
  expect((await as.hrA.post(`/api/hr/expense-notes/${id}/reject`)).status()).toBe(200)
})

test('T10 le RH ne voit rien d\'une autre entreprise', async () => {
  const id = await createNote(B.manager.id)
  expect(await ids(await as.hrA.get('/api/hr/expense-notes'))).not.toContain(id)
  expect((await as.hrA.get(`/api/hr/expense-notes/${id}/receipt-url`)).status()).toBe(404)
  expect((await as.hrA.post(`/api/hr/expense-notes/${id}/approve`)).status()).toBe(404)
  const users = (await (await as.hrA.get('/api/hr/users')).json()) as { id: string }[]
  expect(users.map((u) => u.id)).not.toContain(B.employee.id)
  const res = await as.hrA.put(`/api/hr/users/${B.employee.id}/manager`, { data: { managerId: null } })
  expect(res.status()).toBe(404)
})

test('T19 chaque décision garde sa trace : qui, quand', async () => {
  const byManager = await createNote(A.employee.id)
  const byHr = await createNote(A.manager2.id)
  const before = new Date()
  expect((await as.managerA.post(`/api/manager/expense-notes/${byManager}/approve`)).status()).toBe(200)
  expect((await as.hrA.post(`/api/hr/expense-notes/${byHr}/reject`)).status()).toBe(200)
  const { rows } = await db().query(
    'SELECT id, decided_by, decided_at FROM expense_notes WHERE id = ANY($1::uuid[])',
    [[byManager, byHr]],
  )
  const trace = Object.fromEntries(rows.map((r) => [r.id, r]))
  expect(trace[byManager].decided_by).toBe(A.manager.id)
  expect(trace[byHr].decided_by).toBe(A.hr.id)
  for (const id of [byManager, byHr]) expect(trace[id].decided_at.getTime()).toBeGreaterThanOrEqual(before.getTime() - 5000)
})

// ---------------------------------------------------------------- Failles connues (échecs attendus)

test('T11 [SEC-03] un manager ne lit pas le reçu d\'une note hors de son équipe', async () => {
  for (const owner of [A.employee2, B.employee]) {
    const id = await createNote(owner.id)
    const res = await as.managerA.get(`/api/manager/expense-notes/${id}/receipt-url`)
    expect(res.status(), `reçu de ${owner.email}`).toBe(404)
  }
})

test('T12 [SEC-04] le RH ne rattache pas un employé à un manager d\'une autre entreprise', async () => {
  const employee = await createUser({ id: await companyOf(A.hr), domain: domainOf(A.hr) }, `T12-${short()}`, 'employee')
  const res = await as.hrA.put(`/api/hr/users/${employee.id}/manager`, { data: { managerId: B.manager.id } })
  expect(res.status()).toBe(409)
})

test('T12b [SEC-14] le RH ne crée pas de cycle de managers', async () => {
  const c = { id: await companyOf(A.hr), domain: domainOf(A.hr) }
  const m1 = await createUser(c, `T12b1-${short()}`, 'manager')
  const m2 = await createUser(c, `T12b2-${short()}`, 'manager', m1.id)
  const res = await as.hrA.put(`/api/hr/users/${m1.id}/manager`, { data: { managerId: m2.id } })
  expect(res.status()).toBe(409)
})

test('T13 [SEC-09] un corps JSON mal formé est refusé et ne détache pas le manager', async () => {
  const c = { id: await companyOf(A.hr), domain: domainOf(A.hr) }
  const employee = await createUser(c, `T13-${short()}`, 'employee', A.manager.id)
  const res = await as.hrA.put(`/api/hr/users/${employee.id}/manager`, {
    headers: { 'content-type': 'application/json' },
    data: '{ pas du json',
  })
  const after = await db().query('SELECT manager_id FROM users WHERE id = $1', [employee.id])
  expect(after.rows[0].manager_id, 'le rattachement doit être intact').toBe(A.manager.id)
  // Contrat gelé (décision de Brian, 2026-10-21) : refus avec le 409 « manager invalide » déjà au contrat.
  expect(res.status()).toBe(409)
})

test('T14 [SEC-01] le paramètre sort n\'est jamais exécuté comme du SQL', async () => {
  // Contrat gelé (décision de Brian, 2026-10-21) : un tri hors liste est ignoré (200, tri par défaut), pas refusé.
  // Preuve que rien n'est exécuté : une division par zéro ferait échouer la requête SQL (500).
  const crash = await as.employeeA.get(`/api/expense-notes?sort=${encodeURIComponent('(SELECT 1/0)')}`)
  expect(crash.status()).toBe(200)
  // Tri booléen sur une sous-requête : la réponse doit être exactement celle du tri par défaut.
  const injected = "(CASE WHEN (SELECT count(*) FROM users) > 0 THEN amount ELSE 0 END)"
  const res = await as.employeeA.get(`/api/expense-notes?sort=${encodeURIComponent(injected)}`)
  const byDefault = await as.employeeA.get('/api/expense-notes')
  expect(res.status()).toBe(200)
  expect(await ids(res)).toEqual(await ids(byDefault))
})

test('T14b [SEC-07] une entrée qui faisait planter la base reçoit un 404 générique, sans détail interne', async () => {
  // Avant : un id qui n'est pas un UUID levait une erreur PostgreSQL (500 avec stacktrace, puis 500 générique). Le
  // fuzzing (Schemathesis) l'a montré : c'est une entrée invalide, pas une panne. Le 500 générique lui-même est testé
  // dans tests/unit/http.test.ts, et le fuzzing vérifie qu'aucune requête du contrat n'en produit plus.
  for (const [client, url] of [
    [as.employeeA, '/api/expense-notes/pas-un-uuid/receipt-url'],
    [as.managerA, '/api/manager/expense-notes/pas-un-uuid/receipt-url'],
    [as.hrA, '/api/hr/expense-notes/pas-un-uuid/receipt-url'],
  ] as const) {
    const res = await client.get(url)
    expect(res.status(), url).toBe(404)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(['error'])
    expect(JSON.stringify(body)).not.toMatch(/invalid input syntax|uuid|stack/i)
  }
})

test('T14c [SEC-07] même chose pour les routes qui écrivent (décisions, rattachement)', async () => {
  for (const [client, method, url] of [
    [as.managerA, 'post', '/api/manager/expense-notes/pas-un-uuid/approve'],
    [as.hrA, 'post', '/api/hr/expense-notes/pas-un-uuid/reject'],
    [as.hrA, 'put', '/api/hr/users/pas-un-uuid/manager'],
  ] as const) {
    const res = await client[method](url, { data: { managerId: null } })
    expect(res.status(), url).toBe(404)
    expect(Object.keys(await res.json())).toEqual(['error'])
  }
})

test('T15 [SEC-08] une note ne peut être décidée qu\'une fois, même par deux requêtes simultanées', async () => {
  // 100 paires approve/reject simultanées : sans décision atomique, au moins une paire renvoie deux 200.
  const notes = await Promise.all(Array.from({ length: 100 }, () => createNote(A.employee.id)))
  const results = await Promise.all(
    notes.map(async (id) => {
      const [approve, reject] = await Promise.all([
        as.managerA.post(`/api/manager/expense-notes/${id}/approve`),
        as.managerA.post(`/api/manager/expense-notes/${id}/reject`),
      ])
      return [approve.status(), reject.status()].filter((s) => s === 200).length
    }),
  )
  expect(results.every((successes) => successes === 1)).toBe(true)
})

// Connexion avec les identifiants de l'APPLICATION (DATABASE_URL), pas ceux des fixtures (administrateur).
async function asApp<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: TEST_ENV.DATABASE_URL, max: 1 })
  const client = await pool.connect()
  try {
    return await run(client)
  } finally {
    client.release()
    await pool.end()
  }
}

test('T16 [SEC-05] l\'app ne se connecte pas avec un rôle qui ignore la RLS', async () => {
  const role = await asApp((c) => c.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'))
  expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false })
})

test('T16b [SEC-05] sans contexte utilisateur, la connexion de l\'app ne voit aucune note, même après RESET ROLE', async () => {
  await createNote(A.employee.id)
  const total = Number((await db().query('SELECT count(*) FROM expense_notes')).rows[0].count)
  expect(total, 'contrôle : l\'administrateur voit des notes').toBeGreaterThan(0)
  const seen = await asApp(async (c) => {
    await c.query('RESET ROLE') // ce qu'une injection SQL tenterait pour sortir du rôle limité
    return Number((await c.query('SELECT count(*) FROM expense_notes')).rows[0].count)
  })
  expect(seen).toBe(0)
})

test('T17 [SEC-05] chaque politique RLS des notes filtre aussi par entreprise', async () => {
  const res = await db().query(
    "SELECT policyname, coalesce(qual, '') || coalesce(with_check, '') AS rule FROM pg_policies WHERE tablename = 'expense_notes'",
  )
  const withoutCompany = res.rows.filter((p) => !p.rule.includes('company_id')).map((p) => p.policyname)
  expect(withoutCompany).toEqual([])
})

test('T17b [SEC-05] sous le rôle applicatif, la base cache et protège les notes d\'une autre entreprise', async () => {
  const id = await createNote(A.manager.id) // note d'un manager racine de A : du ressort du RH de A seulement
  const client = await db().connect()
  const as = (userId: string) => client.query("SELECT set_config('app.current_user_id', $1, true)", [userId])
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE expense_app')
    await as(B.hr.id)
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [id])).rowCount, 'lecture par le RH de B').toBe(0)
    const update = await client.query("UPDATE expense_notes SET status = 'approved' WHERE id = $1", [id])
    expect(update.rowCount, 'écriture par le RH de B').toBe(0)
    await as(A.hr.id) // contrôle positif : la politique n'interdit pas tout
    expect((await client.query('SELECT id FROM expense_notes WHERE id = $1', [id])).rowCount, 'lecture par le RH de A').toBe(1)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
})

test('T17c [répétition 4] sous le rôle applicatif, le RH ne voit et ne rembourse que les notes validées des autres membres de son entreprise', async () => {
  const pending = await createNote(A.employee.id) // employé avec manager : en attente, pas du ressort du RH
  const approved = await createNote(A.employee.id, { status: 'approved' })
  const own = await createNote(A.hr.id, { status: 'approved' })
  const client = await db().connect()
  const as = (userId: string) => client.query("SELECT set_config('app.current_user_id', $1, true)", [userId])
  const sees = async (id: string) => (await client.query('SELECT id FROM expense_notes WHERE id = $1', [id])).rowCount
  const reimburse = (id: string, by: string) =>
    client.query("UPDATE expense_notes SET status = 'reimbursed', reimbursed_by = $2 WHERE id = $1", [id, by])
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE expense_app')
    await as(B.hr.id)
    expect(await sees(approved), 'RH d\'une autre entreprise').toBe(0)
    expect((await reimburse(approved, B.hr.id)).rowCount, 'remboursement par le RH de B').toBe(0)
    await as(A.hr.id)
    expect(await sees(pending), 'note en attente d\'un employé avec manager').toBe(0)
    // Sa propre note reste lisible (politique du propriétaire) ; ce qui compte, c'est qu'il ne puisse pas la rembourser.
    expect((await reimburse(own, A.hr.id)).rowCount, 'rembourser sa propre note').toBe(0)
    await client.query('SAVEPOINT avant')
    await expect(reimburse(approved, A.manager.id), 'au nom d\'un autre').rejects.toThrow(/row-level security/)
    await client.query('ROLLBACK TO SAVEPOINT avant')
    expect(await sees(approved), 'contrôle positif : lecture').toBe(1)
    expect((await reimburse(approved, A.hr.id)).rowCount, 'contrôle positif : approved → reimbursed').toBe(1)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
})

test('T18 [SEC-10] un rôle retiré en base est retiré immédiatement, sans attendre l\'expiration du jeton', async ({
  baseURL,
}) => {
  const c = { id: await companyOf(A.hr), domain: domainOf(A.hr) }
  const demoted = await createUser(c, `T18-${short()}`, 'manager')
  const ctx = await login(baseURL!, demoted)
  await db().query("UPDATE users SET role = 'employee' WHERE id = $1", [demoted.id])
  const res = await ctx.get('/api/manager/expense-notes')
  await ctx.dispose()
  expect(res.status()).toBe(401)
})

test('T18b [SEC-02] un jeton signé avec le secret publié dans le dépôt est refusé', async ({ baseURL }) => {
  // Le secret est lu dans l'historique Git (commit d'origine), pas recopié ici : après le correctif, l'app doit
  // refuser tout jeton signé avec ce secret, qui reste public pour toujours.
  const source = execFileSync('git', ['show', '265924b:src/lib/auth.ts'], { encoding: 'utf8' })
  const leaked = /AUTH_SECRET = '([^']+)'/.exec(source)![1]
  const cookieName = 'authjs.session-token'
  const token = await encode({ secret: leaked, salt: cookieName, token: { id: B.hr.id, role: 'hr_admin' } })
  const ctx = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { cookie: `${cookieName}=${token}` },
  })
  const res = await ctx.get('/api/hr/users')
  await ctx.dispose()
  expect(res.status()).toBe(403)
})

// ---------------------------------------------------------------- Outils

/**
 * Marque le test en « échec attendu » à cause d'une faille référencée. Avec AUTHZ_SHOW_FLAWS=1, le marquage est
 * levé : la sortie montre alors l'échec réel de chaque scénario, pour vérifier qu'il échoue pour la bonne raison.
 */
function knownFlaw(ref: string, reason: string): void {
  test.info().annotations.push({ type: 'faille', description: `${ref} : ${reason}` })
  test.fail(process.env.AUTHZ_SHOW_FLAWS !== '1', `${ref} : ${reason}`)
}

function short(): string {
  return randomUUID().slice(0, 6)
}
function domainOf(user: TestUser): string {
  return user.email.split('@')[1]
}
async function companyOf(user: TestUser): Promise<string> {
  return (await db().query('SELECT company_id FROM users WHERE id = $1', [user.id])).rows[0].company_id
}
