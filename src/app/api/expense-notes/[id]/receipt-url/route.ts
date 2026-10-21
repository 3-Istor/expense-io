import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle } from '@/shared/http'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(401, async () => {
    const me = await requireUser()
    const { id } = await params
    return Response.json({ url: await expenseNotes.ownReceiptUrl(me, id) })
  })
}
