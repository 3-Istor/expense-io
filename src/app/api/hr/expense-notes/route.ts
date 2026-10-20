import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle, noteJson } from '@/shared/http'

export async function GET() {
  return handle(403, async () => {
    const me = await requireUser()
    const notes = await expenseNotes.listPending(me, 'hr')
    return Response.json(notes.map(noteJson))
  })
}
