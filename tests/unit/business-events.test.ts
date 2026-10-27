// T-0015 : événements métier et identifiant de requête. Les cas d'usage parlent au port NoteEvents ; l'adaptateur
// écrit une ligne JSON. Testé sans base ni S3.
import { describe, expect, it, vi } from 'vitest'
import { log, withRequestId } from '@/lib/logger'
import { expenseNoteUseCases } from '@/modules/expense-notes/application/use-cases'
import type { ExpenseNote } from '@/modules/expense-notes/domain/expense-note'
import { logNoteEvents } from '@/modules/expense-notes/infrastructure/log-note-events'
import type { ExpenseNoteRepository, NoteEvents } from '@/modules/expense-notes/ports'
import { clientRequestIdFrom, handle } from '@/shared/http'

const NOTE_ID = '6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e6f'
const created = new Date('2026-10-20T10:00:00Z')
const note = (over: Partial<ExpenseNote> = {}): ExpenseNote => ({
  id: NOTE_ID, userId: 'employe', amount: 10, expenseDate: '2026-10-01', description: 'Taxi',
  receiptKey: 'receipts/1.png', status: 'pending', createdAt: created, ...over,
})

function setup(repo: Partial<ExpenseNoteRepository>) {
  const seen: unknown[] = []
  const events: NoteEvents = {
    submitted: () => void seen.push('submitted'),
    decided: (e) => void seen.push(e),
  }
  const useCases = expenseNoteUseCases({
    notes: repo as ExpenseNoteRepository,
    storage: { upload: async () => {}, signedUrl: async () => '' },
    reader: { suggest: async () => ({}) },
    events,
    now: () => new Date('2026-10-22T10:00:00Z'),
  })
  return { useCases, seen }
}

const lines = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((c) => JSON.parse(c[0] as string))

describe('événements métier (T-0015)', () => {
  const receipt = { type: 'image/png', size: 3, bytes: async () => Buffer.from([1, 2, 3]) }
  const input = { amount: '12', expenseDate: '2026-10-01', description: 'Taxi', receipt }

  it('une note créée émet « soumise », une seule fois, après l\'insertion', async () => {
    const { useCases, seen } = setup({ reserveReceiptSeq: async () => 1, insert: async () => note() })
    await useCases.create({ userId: 'employe' }, input)
    expect(seen).toEqual(['submitted'])
  })
  it('une saisie refusée n\'émet rien', async () => {
    const { useCases, seen } = setup({})
    await useCases.create({ userId: 'e' }, { ...input, amount: '-1' }).catch(() => {})
    expect(seen).toEqual([])
  })
  it('une décision émet le délai depuis la soumission, le type de valideur et la décision', async () => {
    const { useCases, seen } = setup({ findInScope: async () => note(), saveDecision: async () => note({ status: 'approved' }) })
    await useCases.decide({ userId: 'manager', role: 'manager' }, 'manager', NOTE_ID, 'approved')
    expect(seen).toEqual([{ decision: 'approved', approver: 'manager', delaySeconds: 2 * 86_400 }])
  })
  it('une décision perdue dans une course (SEC-08) n\'émet rien', async () => {
    const { useCases, seen } = setup({ findInScope: async () => note(), saveDecision: async () => null })
    await useCases.decide({ userId: 'manager', role: 'manager' }, 'manager', NOTE_ID, 'approved').catch(() => {})
    expect(seen).toEqual([])
  })
  it('l\'adaptateur écrit des lignes JSON sans donnée personnelle', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logNoteEvents.submitted()
    logNoteEvents.decided({ decision: 'rejected', approver: 'hr', delaySeconds: 30 })
    expect(lines(spy)).toMatchObject([
      { msg: 'note soumise', event: 'note.submitted' },
      { msg: 'note décidée', event: 'note.decided', decision: 'rejected', approver: 'hr', delaySeconds: 30 },
    ])
    expect(JSON.stringify(lines(spy))).not.toMatch(/employe|Taxi|amount/)
    spy.mockRestore()
  })
})

describe('identifiant de requête (T-0015)', () => {
  it('chaque ligne écrite dans le contexte porte le requestId, et seulement là', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    withRequestId('req-1', () => log('info', 'dans la requête'))
    log('info', 'hors requête')
    const [inside, outside] = lines(spy)
    expect(inside.requestId).toBe('req-1')
    expect(outside).not.toHaveProperty('requestId')
    spy.mockRestore()
  })
  it('garde l\'identifiant du client seulement s\'il est sûr (journalisé à part, jamais comme requestId)', () => {
    expect(clientRequestIdFrom('abc-123_x.y')).toBe('abc-123_x.y')
    for (const unsafe of [null, '', 'a b', 'x'.repeat(129), '"><script>']) {
      expect(clientRequestIdFrom(unsafe)).toBeNull()
    }
  })
  it('handle() : la ligne d\'API et celle de l\'erreur 500 partagent le même requestId, la réponse ne change pas', async () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await handle('op', 401, async () => { throw new Error('boom') })
    const all = [...lines(out), ...lines(err)]
    const ids = new Set(all.map((l) => l.requestId))
    expect(ids.size).toBe(1)
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(Object.keys(await res.json()).sort()).toEqual(['error', 'errorId', 'stack'])
    out.mockRestore()
    err.mockRestore()
  })
})
