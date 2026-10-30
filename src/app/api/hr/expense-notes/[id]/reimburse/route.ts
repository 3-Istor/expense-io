import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle, noteJson } from '@/shared/http'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('hrReimburseNote', 403, async () => {
    const me = await requireUser()
    const { id } = await params
    return Response.json(noteJson(await expenseNotes.reimburse(me, id)))
  })
}
