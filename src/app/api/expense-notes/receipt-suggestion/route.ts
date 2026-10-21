import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle, readForm, receiptFrom } from '@/shared/http'

export async function POST(request: Request) {
  return handle('suggestFromReceipt', 401, async () => {
    await requireUser()
    const form = await readForm(request)
    return Response.json(await expenseNotes.suggest(receiptFrom(form.get('receipt'))))
  })
}
