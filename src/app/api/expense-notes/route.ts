import type { NextRequest } from 'next/server'
import { expenseNotes } from '@/modules/expense-notes'
import { requireUser } from '@/modules/identity/session'
import { handle, noteJson, receiptFrom } from '@/shared/http'

export async function GET(request: NextRequest) {
  return handle('listMyExpenseNotes', 401, async () => {
    const me = await requireUser()
    const notes = await expenseNotes.listOwn(me, new URL(request.url).searchParams.get('sort'))
    return Response.json(notes.map(noteJson))
  })
}

export async function POST(request: NextRequest) {
  return handle('createExpenseNote', 401, async () => {
    const me = await requireUser()
    const form = await request.formData()
    const note = await expenseNotes.create(me, {
      amount: form.get('amount'),
      expenseDate: form.get('expenseDate'),
      description: form.get('description'),
      category: form.get('category'),
      receipt: receiptFrom(form.get('receipt')),
    })
    return Response.json(noteJson(note), { status: 201 })
  })
}
