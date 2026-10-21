import { auth } from '@/lib/auth'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'
import { toExpenseNote } from '@/lib/expense-note-dto'


export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'manager') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return await withUserScope(session.user.id, async (client) => {
      const result = await client.query(
        `SELECT en.* FROM expense_notes en
         JOIN users u ON u.id = en.user_id
         WHERE u.manager_id = $1 AND en.status = 'pending'
         ORDER BY en.created_at ASC`,
        [session.user.id]
      )
      return Response.json(result.rows.map(toExpenseNote))
    })
  } catch (error) {
    return respondError(error)
  }
}
