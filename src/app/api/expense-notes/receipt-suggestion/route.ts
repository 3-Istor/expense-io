import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle, receiptFrom } from '@/shared/http'

export async function POST(request: Request) {
  return handle(401, async () => {
    await requireUser()
    const form = await request.formData()
    return Response.json(await expenseNotes.suggest(receiptFrom(form.get('receipt'))))
  })
}
