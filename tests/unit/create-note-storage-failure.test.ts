// SEC-12 : si le stockage du reçu échoue, aucune note n'est créée.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queries: string[] = []
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'u1', role: 'employee' } }) }))
vi.mock('@/lib/db', () => ({
  withUserScope: async (_userId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: async (sql: string) => {
        queries.push(sql)
        return { rows: [{ seq: 41 }] }
      },
    }),
}))
vi.mock('@/lib/storage', () => ({
  uploadReceipt: async () => {
    throw new Error('S3 indisponible')
  },
}))
vi.spyOn(console, 'error').mockImplementation(() => {})

const { POST } = await import('@/app/api/expense-notes/route')

function request(): Request {
  const form = new FormData()
  form.set('amount', '12.5')
  form.set('expenseDate', '2026-10-01')
  form.set('description', 'Taxi')
  form.set('receipt', new File([new Uint8Array([1, 2, 3])], 'recu.png', { type: 'image/png' }))
  return new Request('http://localhost/api/expense-notes', { method: 'POST', body: form })
}

describe('POST /api/expense-notes quand le stockage est en panne (SEC-12)', () => {
  beforeEach(() => {
    queries.length = 0
  })

  it('renvoie 500 sans avoir inséré de note', async () => {
    const res = await POST(request() as never)
    expect(res.status).toBe(500)
    expect(queries.some((sql) => /INSERT INTO expense_notes/i.test(sql))).toBe(false)
  })
})
