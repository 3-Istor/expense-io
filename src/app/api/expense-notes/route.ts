import path from 'node:path'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getPool, withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'
import { toExpenseNote } from '@/lib/expense-note-dto'
import { receiptKeyFor, uploadReceipt } from '@/lib/storage'

const ALLOWED_RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}


// Tris autorisés (SEC-01) : `<colonne>` ou `<colonne> ASC|DESC`. Chaque requête est une constante choisie dans
// une liste fermée ; la valeur reçue n'est jamais recopiée dans le SQL.
const SORTABLE_COLUMNS = ['created_at', 'amount', 'expense_date', 'status', 'description'] as const
const LIST_QUERY_BY_SORT = new Map<string, string>(
  SORTABLE_COLUMNS.flatMap((column) =>
    (['ASC', 'DESC'] as const).map((direction) => [
      `${column} ${direction}`,
      `SELECT * FROM expense_notes WHERE user_id = $1 ORDER BY ${column} ${direction}`,
    ])
  )
)

function listQueryFor(sort: string | null): string | undefined {
  if (!sort) return LIST_QUERY_BY_SORT.get('created_at DESC')
  const match = /^\s*([a-z_]+)(?:\s+(asc|desc))?\s*$/i.exec(sort)
  if (!match) return undefined
  return LIST_QUERY_BY_SORT.get(`${match[1].toLowerCase()} ${(match[2] ?? 'ASC').toUpperCase()}`)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = listQueryFor(new URL(request.url).searchParams.get('sort'))
    if (!query) {
      return Response.json({ error: 'Tri non autorisé' }, { status: 400 })
    }

    return await withUserScope(session.user.id, async (client) => {
      const result = await client.query(query, [session.user.id])
      return Response.json(result.rows.map(toExpenseNote))
    })
  } catch (error) {
    return respondError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const amountRaw = formData.get('amount')
    const expenseDate = formData.get('expenseDate')
    const description = formData.get('description')
    const receipt = formData.get('receipt')

    const amount = typeof amountRaw === 'string' ? Number.parseFloat(amountRaw) : NaN

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      typeof expenseDate !== 'string' ||
      typeof description !== 'string' ||
      description.trim().length === 0 ||
      !(receipt instanceof File)
    ) {
      return Response.json({ error: 'Champs invalides' }, { status: 400 })
    }
    if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) {
      return Response.json({ error: 'Type de fichier non autorisé pour le reçu' }, { status: 400 })
    }
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return Response.json({ error: 'Fichier trop volumineux' }, { status: 400 })
    }

    const note = await withUserScope(session.user.id, async (client) => {
      const inserted = await client.query(
        `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [session.user.id, amount, expenseDate, description, '']
      )
      return inserted.rows[0]
    })

    const extension = EXTENSION_BY_MIME[receipt.type] ?? path.extname(receipt.name) ?? ''
    const receiptKey = receiptKeyFor(note.receipt_seq, extension)
    const buffer = Buffer.from(await receipt.arrayBuffer())
    await uploadReceipt(receiptKey, buffer, receipt.type)

    const updated = await getPool().query(
      `UPDATE expense_notes SET receipt_key = $1 WHERE id = $2 RETURNING *`,
      [receiptKey, note.id]
    )

    return Response.json(toExpenseNote(updated.rows[0]), { status: 201 })
  } catch (error) {
    return respondError(error)
  }
}
