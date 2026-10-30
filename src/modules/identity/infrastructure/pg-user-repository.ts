// Adaptateurs PostgreSQL du module identity.
import { getPool, withUserScope } from '@/lib/db'
import type { Role, User } from '../domain/user'
import type { AccountStore, UserRepository } from '../ports'

const toUser = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  name: row.name as string,
  email: row.email as string,
  role: row.role as Role,
  managerId: (row.manager_id as string | null) ?? null,
})

export const pgUserRepository: UserRepository = {
  listDirectory: (caller) =>
    withUserScope(caller.userId, async (db) => {
      const res = await db.query(
        `SELECT id, name, email, role, manager_id FROM users
         WHERE role IN ('employee', 'manager')
           AND company_id = (SELECT company_id FROM users WHERE id = $1)
         ORDER BY name`,
        [caller.userId],
      )
      return res.rows.map(toUser)
    }),

  // Vérifications et écriture dans une seule transaction : pas de cycle créé entre deux requêtes simultanées.
  assignManager: (caller, targetId, managerId) =>
    withUserScope(caller.userId, async (db) => {
      const company = (await db.query('SELECT company_id FROM users WHERE id = $1', [caller.userId])).rows[0]?.company_id
      if (!company) return { ok: false, reason: 'target-not-found' } as const
      const target = await db.query(
        `SELECT id, manager_id FROM users WHERE id = $1 AND company_id = $2 AND role IN ('employee', 'manager') FOR UPDATE`,
        [targetId, company],
      )
      if (!target.rows[0]) return { ok: false, reason: 'target-not-found' } as const

      if (managerId !== null) {
        const manager = await db.query(`SELECT id FROM users WHERE id = $1 AND role = 'manager' AND company_id = $2`, [
          managerId,
          company,
        ])
        if (!manager.rows[0]) return { ok: false, reason: 'invalid-manager' } as const
        const cycle = await db.query(
          `WITH RECURSIVE chain(id) AS (
             SELECT manager_id FROM users WHERE id = $1
             UNION
             SELECT u.manager_id FROM users u JOIN chain c ON u.id = c.id
           )
           SELECT 1 FROM chain WHERE id = $2`,
          [managerId, targetId],
        )
        if (cycle.rows[0]) return { ok: false, reason: 'invalid-manager' } as const
      }

      const previousManagerId: string | null = target.rows[0].manager_id ?? null
      const updated = await db.query(
        'UPDATE users SET manager_id = $1 WHERE id = $2 RETURNING id, name, email, role, manager_id',
        [managerId, targetId],
      )
      // Historique (T-0020), dans la même transaction : pas de changement sans trace, pas de trace sans changement.
      // Comparaison sur la valeur relue en base (UUID normalisé), pas sur la saisie du client (majuscules acceptées).
      // Table en ajout seul : le rôle applicatif ne peut ni la modifier ni l'effacer (migration 0007).
      const newManagerId: string | null = updated.rows[0].manager_id ?? null
      if (previousManagerId !== newManagerId) {
        await db.query(
          `INSERT INTO manager_changes (company_id, user_id, previous_manager_id, new_manager_id, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [company, targetId, previousManagerId, newManagerId, caller.userId],
        )
      }
      return { ok: true, user: toUser(updated.rows[0]), previousManagerId } as const
    }),
}

// Avant toute session : pas d'appelant, donc pas de withUserScope. Lecture seule, par clé unique.
export const pgAccountStore: AccountStore = {
  async findByEmail(email) {
    const row = (await getPool().query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email])).rows[0]
    return row ? { id: row.id, email: row.email, role: row.role, passwordHash: row.password_hash } : null
  },
  async roleOf(userId) {
    return (await getPool().query('SELECT role FROM users WHERE id = $1', [userId])).rows[0]?.role ?? null
  },
  async register({ name, email, passwordHash, domain }) {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      const company = await client.query<{ id: string }>(
        `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
         ON CONFLICT (email_domain) DO NOTHING
         RETURNING id`,
        [domain.split('.')[0], domain],
      )
      const created = company.rows[0]
      const companyId =
        created?.id ?? (await client.query('SELECT id FROM companies WHERE email_domain = $1', [domain])).rows[0].id
      const inserted = await client.query(
        `INSERT INTO users (name, email, password_hash, company_id, role) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [name, email, passwordHash, companyId, created ? 'hr_admin' : 'employee'],
      )
      if (!inserted.rows[0]) {
        await client.query('ROLLBACK') // email déjà pris : l'entreprise éventuellement créée est annulée aussi
        return 'email-taken'
      }
      await client.query('COMMIT')
      return 'created'
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}
