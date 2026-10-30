// Historique des changements de manager (T-0020) : chaque changement effectif est inscrit (qui, quand, avant, après),
// une réaffectation identique ne l'est pas, et seul un RH de la même entreprise peut lire ou écrire l'historique.
// La réponse de PUT /api/hr/users/{id}/manager ne change pas (contrat inchangé).
import { expect, test } from '@playwright/test'
import { closeDb, createCompany, createUser, db, login } from '../support/fixtures'

test.afterAll(async () => {
  await closeDb()
})

const history = async (userId: string) =>
  (
    await db().query(
      `SELECT company_id, previous_manager_id, new_manager_id, changed_by FROM manager_changes
       WHERE user_id = $1 ORDER BY changed_at, id`,
      [userId],
    )
  ).rows

/** Exécute `sql` comme l'application (rôle expense_app, appelant `userId`), puis annule tout. */
async function asApp<T>(userId: string, run: (q: (sql: string, params?: unknown[]) => Promise<{ rows: T[] }>) => Promise<void>) {
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE expense_app')
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId])
    await run((sql, params) => client.query(sql, params as unknown[]) as never)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
}

test('T-0020 chaque changement de manager est tracé, une réaffectation identique non', async ({ baseURL }) => {
  const a = await createCompany()
  const hr = await createUser(a, 'HistoRh', 'hr_admin')
  const m1 = await createUser(a, 'HistoM1', 'manager')
  const m2 = await createUser(a, 'HistoM2', 'manager')
  const employee = await createUser(a, 'HistoEmploye', 'employee', m1.id)
  const asHr = await login(baseURL!, hr)
  const put = (managerId: string | null) => asHr.put(`/api/hr/users/${employee.id}/manager`, { data: { managerId } })

  const moved = await put(m2.id)
  expect(moved.status()).toBe(200)
  expect(await moved.json()).toMatchObject({ id: employee.id, managerId: m2.id })
  expect(await history(employee.id)).toEqual([{ company_id: a.id, previous_manager_id: m1.id, new_manager_id: m2.id, changed_by: hr.id }])

  expect((await put(m2.id)).status()).toBe(200) // même manager : pas de nouvelle ligne
  expect((await put(m2.id.toUpperCase())).status()).toBe(200) // même manager écrit en majuscules : pas de ligne non plus
  expect(await history(employee.id)).toHaveLength(1)

  expect((await put(null)).status()).toBe(200) // détachement : tracé aussi
  expect((await history(employee.id)).at(-1)).toEqual({ company_id: a.id, previous_manager_id: m2.id, new_manager_id: null, changed_by: hr.id })
  await asHr.dispose()
})

test('T-0020 l’historique est lisible et inscriptible par un RH de la même entreprise seulement, jamais modifiable', async ({ baseURL }) => {
  const a = await createCompany()
  const b = await createCompany()
  const hrA = await createUser(a, 'HistoRhA', 'hr_admin')
  const hrB = await createUser(b, 'HistoRhB', 'hr_admin')
  const m = await createUser(a, 'HistoMa', 'manager')
  const employee = await createUser(a, 'HistoEmpA', 'employee')
  const asHr = await login(baseURL!, hrA)
  expect((await asHr.put(`/api/hr/users/${employee.id}/manager`, { data: { managerId: m.id } })).status()).toBe(200)
  await asHr.dispose()

  const count = 'SELECT count(*)::int AS n FROM manager_changes WHERE user_id = $1'
  await asApp<{ n: number }>(hrA.id, async (q) => expect((await q(count, [employee.id])).rows[0].n).toBe(1))
  await asApp<{ n: number }>(hrB.id, async (q) => expect((await q(count, [employee.id])).rows[0].n).toBe(0))
  await asApp<{ n: number }>(employee.id, async (q) => expect((await q(count, [employee.id])).rows[0].n).toBe(0))
  // Un employé ne peut pas écrire de fausse trace ; personne ne peut modifier ni effacer l'historique.
  await asApp(employee.id, async (q) =>
    expect(q('INSERT INTO manager_changes (company_id, user_id, changed_by) VALUES ($1, $2, $2)', [a.id, employee.id])).rejects.toThrow(),
  )
  await asApp(hrA.id, async (q) => expect(q('DELETE FROM manager_changes WHERE user_id = $1', [employee.id])).rejects.toThrow())
  // Un RH ne peut pas inscrire une trace sur un compte d'une autre entreprise.
  const other = await createUser(b, 'HistoEmpB', 'employee')
  await asApp(hrA.id, async (q) =>
    expect(q('INSERT INTO manager_changes (company_id, user_id, changed_by) VALUES ($1, $2, $3)', [a.id, other.id, hrA.id])).rejects.toThrow(),
  )
  // L'historique ne bloque pas la suppression d'un compte par un administrateur.
  await db().query('DELETE FROM users WHERE id = $1', [employee.id])
  expect(await history(employee.id)).toHaveLength(0)
  await asApp(hrA.id, async (q) => expect(q('UPDATE manager_changes SET changed_by = $1', [hrA.id])).rejects.toThrow())
})

test('T-0023 un manager ne peut pas être rattaché à lui-même, même avec son UUID en majuscules', async ({ baseURL }) => {
  const a = await createCompany()
  const hr = await createUser(a, 'CasseRh', 'hr_admin')
  const m = await createUser(a, 'CasseManager', 'manager')
  const asHr = await login(baseURL!, hr)
  for (const target of [m.id, m.id.toUpperCase()]) {
    const res = await asHr.put(`/api/hr/users/${target}/manager`, { data: { managerId: m.id.toUpperCase() } })
    expect(res.status(), target).toBe(409)
  }
  const row = await db().query('SELECT manager_id FROM users WHERE id = $1', [m.id])
  expect(row.rows[0].manager_id).toBeNull()
  expect(await history(m.id)).toHaveLength(0)
  await asHr.dispose()
})
