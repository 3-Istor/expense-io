// Cas d'usage testés sans base ni S3 : des faux adaptateurs en mémoire suffisent (intérêt de l'hexagonale).
import { describe, expect, it } from 'vitest'
import { expenseNoteUseCases } from '@/modules/expense-notes/application/use-cases'
import type { ExpenseNote } from '@/modules/expense-notes/domain/expense-note'
import type { ExpenseNoteRepository } from '@/modules/expense-notes/ports'
import { AppError } from '@/shared/app-error'

const note = (over: Partial<ExpenseNote> = {}): ExpenseNote => ({
  id: 'n1',
  userId: 'employe',
  amount: 10,
  expenseDate: '2026-10-01',
  description: 'Taxi',
  receiptKey: 'receipts/1.png',
  status: 'pending',
  createdAt: new Date(0),
  ...over,
})

function setup(repo: Partial<ExpenseNoteRepository>) {
  const uploads: string[] = []
  const useCases = expenseNoteUseCases({
    notes: repo as ExpenseNoteRepository,
    storage: { upload: async (key) => void uploads.push(key), signedUrl: async (key) => `https://s3/${key}` },
    reader: { suggest: async () => ({}) },
  })
  return { useCases, uploads }
}

const kindOf = async (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e) => (e instanceof AppError ? e.kind : 'autre'),
  )

const manager = { userId: 'manager', role: 'manager' as const }

describe('décider d\'une note', () => {
  it('refuse un appelant qui n\'a pas le rôle attendu', async () => {
    const { useCases } = setup({})
    expect(await kindOf(useCases.decide({ userId: 'e', role: 'employee' }, 'manager', 'n1', 'approved'))).toBe('denied')
    expect(await kindOf(useCases.decide(manager, 'hr', 'n1', 'approved'))).toBe('denied')
  })
  it('404 hors périmètre, 409 si déjà décidée', async () => {
    expect(await kindOf(setup({ findInScope: async () => null }).useCases.decide(manager, 'manager', 'n1', 'approved'))).toBe('not-found')
    const decided = setup({ findInScope: async () => note({ status: 'approved' }) })
    expect(await kindOf(decided.useCases.decide(manager, 'manager', 'n1', 'rejected'))).toBe('conflict')
  })
  it('409 si une autre requête a décidé entre la lecture et l\'écriture (SEC-08)', async () => {
    const { useCases } = setup({ findInScope: async () => note(), saveDecision: async () => null })
    expect(await kindOf(useCases.decide(manager, 'manager', 'n1', 'approved'))).toBe('conflict')
  })
  it('renvoie la note décidée', async () => {
    const { useCases } = setup({
      findInScope: async () => note(),
      saveDecision: async (_c, _k, _id, decision) => note({ status: decision }),
    })
    expect((await useCases.decide(manager, 'manager', 'n1', 'rejected')).status).toBe('rejected')
  })
})

describe('créer une note', () => {
  const receipt = { type: 'image/png', size: 3, bytes: async () => Buffer.from([1, 2, 3]) }
  const input = { amount: '12', expenseDate: '2026-10-01', description: 'Taxi', receipt }

  it('stocke le reçu avant d\'insérer la note, avec la clé réservée (SEC-12)', async () => {
    const order: string[] = []
    const { useCases, uploads } = setup({
      reserveReceiptSeq: async () => (order.push('réserve'), 7),
      insert: async (_c, n) => (order.push(`insère ${n.receiptKey}`), note({ receiptKey: n.receiptKey })),
    })
    await useCases.create({ userId: 'employe' }, input)
    expect(uploads).toEqual(['receipts/7.png'])
    expect(order).toEqual(['réserve', 'insère receipts/7.png'])
  })
  it('refuse une saisie invalide avant tout stockage', async () => {
    const { useCases, uploads } = setup({})
    expect(await kindOf(useCases.create({ userId: 'e' }, { ...input, amount: '-1' }))).toBe('invalid')
    expect(await kindOf(useCases.create({ userId: 'e' }, { ...input, receipt: { ...receipt, type: 'text/plain' } }))).toBe('invalid')
    expect(uploads).toEqual([])
  })
})

describe('cas d\'usage expense-notes : lecture, reçus, OCR (tests de mutation)', () => {
  const employee = { userId: 'employe' }
  const message = (p: Promise<unknown>) => p.then(() => 'ok', (e: Error) => e.message)

  it('liste ses notes : tri demandé, ou tri par défaut si hors liste', async () => {
    const sorts: unknown[] = []
    const { useCases } = setup({ listOwn: async (_c, sort) => (sorts.push(sort), []) })
    await useCases.listOwn(employee, 'amount desc')
    await useCases.listOwn(employee, 'password_hash')
    expect(sorts).toEqual([{ column: 'amount', direction: 'DESC' }, { column: 'created_at', direction: 'DESC' }])
  })
  it('URL de son reçu : signée si la note est à soi, 404 sinon', async () => {
    expect(await setup({ findOwn: async () => note() }).useCases.ownReceiptUrl(employee, 'n1')).toBe('https://s3/receipts/1.png')
    expect(await kindOf(setup({ findOwn: async () => null }).useCases.ownReceiptUrl(employee, 'n1'))).toBe('not-found')
  })
  it('URL d\'un reçu pour un valideur : dans son périmètre seulement', async () => {
    const inScope = setup({ findInScope: async () => note() })
    expect(await inScope.useCases.approverReceiptUrl(manager, 'manager', 'n1')).toBe('https://s3/receipts/1.png')
    expect(await kindOf(setup({ findInScope: async () => null }).useCases.approverReceiptUrl(manager, 'manager', 'n1'))).toBe('not-found')
  })
  it('liste des notes en attente : passe le type de valideur au dépôt', async () => {
    const kinds: unknown[] = []
    const { useCases } = setup({ listPendingInScope: async (_c, kind) => (kinds.push(kind), [note()]) })
    expect(await useCases.listPending(manager, 'manager')).toHaveLength(1)
    expect(kinds).toEqual(['manager'])
  })
  it('suggestion OCR : refuse l\'absence de fichier et plus de 10 Mo, transmet le contenu sinon', async () => {
    const seen: unknown[] = []
    const useCases = expenseNoteUseCases({
      notes: {} as ExpenseNoteRepository,
      storage: { upload: async () => {}, signedUrl: async () => '' },
      reader: { suggest: async (r) => (seen.push(r), { amount: 12 }) },
    })
    const file = (size: number) => ({ type: 'image/png', size, bytes: async () => Buffer.from([7]) })
    expect(await kindOf(useCases.suggest(null))).toBe('invalid')
    expect(await message(useCases.suggest(file(10 * 1024 * 1024 + 1)))).toBe('Fichier trop volumineux')
    expect(await useCases.suggest(file(10 * 1024 * 1024))).toEqual({ amount: 12 }) // 10 Mo pile : accepté
    expect(seen).toEqual([{ data: Buffer.from([7]), mimeType: 'image/png' }])
  })
  it('décision : sa propre note est introuvable (404), messages exacts du contrat', async () => {
    const own = setup({ findInScope: async () => note({ userId: 'manager' }) })
    expect(await kindOf(own.useCases.decide(manager, 'manager', 'n1', 'approved'))).toBe('not-found')
    const decided = setup({ findInScope: async () => note({ status: 'approved' }) })
    expect(await message(decided.useCases.decide(manager, 'manager', 'n1', 'rejected'))).toBe('Already decided')
    const raced = setup({ findInScope: async () => note(), saveDecision: async () => null })
    expect(await message(raced.useCases.decide(manager, 'manager', 'n1', 'approved'))).toBe('Already decided')
  })
})
