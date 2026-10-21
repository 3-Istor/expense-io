import { auth } from '@/lib/auth'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Corps attendu : `{ managerId: <uuid> | null }`, rien d'autre (SEC-09). */
function parseManagerId(body: unknown): { managerId: string | null } | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body) || !('managerId' in body)) return null
  const { managerId } = body as { managerId: unknown }
  if (managerId === null) return { managerId: null }
  return typeof managerId === 'string' && UUID.test(managerId) ? { managerId } : null
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'hr_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    // Un corps illisible est refusé : avant, il valait { managerId: null } et détachait le manager (SEC-09).
    const parsed = parseManagerId(await request.json().catch(() => undefined))
    if (!parsed) {
      return Response.json({ error: 'Champs invalides' }, { status: 400 })
    }
    const { managerId } = parsed

    // Vérifications et écriture dans une seule transaction : pas de cycle créé entre deux requêtes simultanées.
    return await withUserScope(session.user.id, async (client) => {
      const hrAdmin = await client.query('SELECT company_id FROM users WHERE id = $1', [session.user.id])
      const companyId = hrAdmin.rows[0]?.company_id
      if (!companyId) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }

      const target = await client.query(
        `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role IN ('employee', 'manager') FOR UPDATE`,
        [id, companyId]
      )
      if (!target.rows[0]) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }

      if (managerId !== null) {
        if (managerId === id) {
          return Response.json({ error: 'Invalid manager' }, { status: 409 })
        }
        // Le manager doit être un manager de la MÊME entreprise (SEC-04) : la route le vérifie elle-même,
        // sans supposer que l'annuaire affiché par l'UI a déjà filtré.
        const manager = await client.query(
          `SELECT id FROM users WHERE id = $1 AND role = 'manager' AND company_id = $2`,
          [managerId, companyId]
        )
        if (!manager.rows[0]) {
          return Response.json({ error: 'Invalid manager' }, { status: 409 })
        }
        // Pas de cycle (SEC-14) : la cible ne doit pas déjà figurer dans la chaîne hiérarchique du manager choisi.
        const cycle = await client.query(
          `WITH RECURSIVE chain(id) AS (
             SELECT manager_id FROM users WHERE id = $1
             UNION
             SELECT u.manager_id FROM users u JOIN chain c ON u.id = c.id
           )
           SELECT 1 FROM chain WHERE id = $2`,
          [managerId, id]
        )
        if (cycle.rows[0]) {
          return Response.json({ error: 'Invalid manager' }, { status: 409 })
        }
      }

      const updated = await client.query(
        `UPDATE users SET manager_id = $1 WHERE id = $2
         RETURNING id, name, email, role, manager_id`,
        [managerId, id]
      )
      const user = updated.rows[0]
      return Response.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.manager_id,
      })
    })
  } catch (error) {
    return respondError(error)
  }
}
