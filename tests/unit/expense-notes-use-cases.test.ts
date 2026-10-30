// Cas d'usage testés sans base ni S3 : des faux adaptateurs en mémoire suffisent (intérêt de l'hexagonale).
import { describe, expect, it } from 'vitest'
import { expenseNoteUseCases } from '@/modules/expense-notes/application/use-cases'
import type { ExpenseNote } from '@/modules/expense-notes/domain/expense-note'
import type { ExpenseNoteRepository } from '@/modules/expense-notes/ports'
import { AppError } from '@/shared/app-error'

// Identifiant réaliste : un id qui n'est pas un UUID est rejeté d'emblée (404) par les cas d'usage.
const NOTE_ID = '6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e6f'

const note = (over: Partial<ExpenseNote> = {}): ExpenseNote => ({
  id: NOTE_ID,
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
    expect(await kindOf(useCases.decide({ userId: 'e', role: 'employee' }, 'manager', NOTE_ID, 'approved'))).toBe('denied')
    expect(await kindOf(useCases.decide(manager, 'hr', NOTE_ID, 'approved'))).toBe('denied')
  })
  it('404 hors périmètre, 409 si déjà décidée', async () => {
    expect(await kindOf(setup({ findInScope: async () => null }).useCases.decide(manager, 'manager', NOTE_ID, 'approved'))).toBe('not-found')
    const decided = setup({ findInScope: async () => note({ status: 'approved' }) })
    expect(await kindOf(decided.useCases.decide(manager, 'manager', NOTE_ID, 'rejected'))).toBe('conflict')
  })
  it('409 si une autre requête a décidé entre la lecture et l\'écriture (SEC-08)', async () => {
    const { useCases } = setup({ findInScope: async () => note(), saveDecision: async () => null })
    expect(await kindOf(useCases.decide(manager, 'manager', NOTE_ID, 'approved'))).toBe('conflict')
  })
  it('renvoie la note décidée', async () => {
    const { useCases } = setup({
      findInScope: async () => note(),
      saveDecision: async (_c, _k, _id, decision) => note({ status: decision }),
    })
    expect((await useCases.decide(manager, 'manager', NOTE_ID, 'rejected')).status).toBe('rejected')
  })
})

describe('rembourser une note (répétition 4)', () => {
  const hr = { userId: 'rh', role: 'hr_admin' as const }
  it('refuse tout autre rôle que hr_admin (403)', async () => {
    const { useCases } = setup({})
    expect(await kindOf(useCases.reimburse(manager, NOTE_ID))).toBe('denied')
    expect(await kindOf(useCases.reimburse({ userId: 'e', role: 'employee' }, NOTE_ID))).toBe('denied')
  })
  it('404 identifiant mal formé, hors entreprise ou sa propre note', async () => {
    expect(await kindOf(setup({}).useCases.reimburse(hr, 'pas-un-uuid'))).toBe('not-found')
    expect(await kindOf(setup({ findReimbursable: async () => null }).useCases.reimburse(hr, NOTE_ID))).toBe('not-found')
    const own = setup({ findReimbursable: async () => note({ userId: 'rh', status: 'approved' }) })
    expect(await kindOf(own.useCases.reimburse(hr, NOTE_ID))).toBe('not-found')
  })
  it('409 si la note n\'est pas validée, ou remboursée entre-temps', async () => {
    for (const status of ['pending', 'rejected', 'reimbursed'] as const) {
      const { useCases } = setup({ findReimbursable: async () => note({ status }) })
      expect(await kindOf(useCases.reimburse(hr, NOTE_ID))).toBe('conflict')
    }
    const raced = setup({ findReimbursable: async () => note({ status: 'approved' }), saveReimbursement: async () => null })
    expect(await kindOf(raced.useCases.reimburse(hr, NOTE_ID))).toBe('conflict')
  })
  it('renvoie la note remboursée', async () => {
    const { useCases } = setup({
      findReimbursable: async () => note({ status: 'approved' }),
      saveReimbursement: async () => note({ status: 'reimbursed' }),
    })
    expect((await useCases.reimburse(hr, NOTE_ID)).status).toBe('reimbursed')
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
    expect(uploads).toHaveLength(1)
    expect(order).toEqual(['réserve', 'insère receipts/7.png']) // receiptKey : format du contrat, inchangé
  })
  it('stocke le fichier sous une clé opaque, différente de receiptKey et d\'une note à l\'autre (SEC-13)', async () => {
    const inserted: { receiptKey: string; storageKey: string }[] = []
    let seq = 7
    const { useCases, uploads } = setup({
      reserveReceiptSeq: async () => seq++,
      insert: async (_c, n) => (inserted.push(n), note({ receiptKey: n.receiptKey, storageKey: n.storageKey })),
    })
    await useCases.create({ userId: 'employe' }, input)
    await useCases.create({ userId: 'employe' }, input)
    for (const key of uploads) expect(key).toMatch(/^receipts\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/)
    expect(uploads[0]).not.toBe(uploads[1])
    expect(inserted.map((n) => n.storageKey)).toEqual(uploads) // le fichier est là où la note dit qu'il est
    expect(inserted.map((n) => n.receiptKey)).toEqual(['receipts/7.png', 'receipts/8.png'])
  })
  it('URL signée : clé opaque si la note en a une, receiptKey sinon (notes d\'avant SEC-13)', async () => {
    const recent = setup({ findOwn: async () => note({ storageKey: 'receipts/opaque.png' }) })
    expect(await recent.useCases.ownReceiptUrl({ userId: 'employe' }, NOTE_ID)).toBe('https://s3/receipts/opaque.png')
    const old = setup({ findOwn: async () => note({ storageKey: null }) })
    expect(await old.useCases.ownReceiptUrl({ userId: 'employe' }, NOTE_ID)).toBe('https://s3/receipts/1.png')
    const approver = setup({ findInScope: async () => note({ storageKey: 'receipts/opaque.png' }) })
    expect(await approver.useCases.approverReceiptUrl(manager, 'manager', NOTE_ID)).toBe('https://s3/receipts/opaque.png')
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
    expect(await setup({ findOwn: async () => note() }).useCases.ownReceiptUrl(employee, NOTE_ID)).toBe('https://s3/receipts/1.png')
    expect(await kindOf(setup({ findOwn: async () => null }).useCases.ownReceiptUrl(employee, NOTE_ID))).toBe('not-found')
  })
  it('URL d\'un reçu pour un valideur : dans son périmètre seulement', async () => {
    const inScope = setup({ findInScope: async () => note() })
    expect(await inScope.useCases.approverReceiptUrl(manager, 'manager', NOTE_ID)).toBe('https://s3/receipts/1.png')
    expect(await kindOf(setup({ findInScope: async () => null }).useCases.approverReceiptUrl(manager, 'manager', NOTE_ID))).toBe('not-found')
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
    expect(await kindOf(own.useCases.decide(manager, 'manager', NOTE_ID, 'approved'))).toBe('not-found')
    const decided = setup({ findInScope: async () => note({ status: 'approved' }) })
    expect(await message(decided.useCases.decide(manager, 'manager', NOTE_ID, 'rejected'))).toBe('Already decided')
    const raced = setup({ findInScope: async () => note(), saveDecision: async () => null })
    expect(await message(raced.useCases.decide(manager, 'manager', NOTE_ID, 'approved'))).toBe('Already decided')
  })
})

describe('identifiant mal formé (trouvé par fuzzing : 500 avant)', () => {
  it('404 sans interroger la base', async () => {
    let queried = false
    const spy = async () => ((queried = true), null)
    const { useCases } = setup({ findOwn: spy, findInScope: spy })
    expect(await kindOf(useCases.ownReceiptUrl({ userId: 'e' }, 'pas-un-uuid'))).toBe('not-found')
    expect(await kindOf(useCases.approverReceiptUrl(manager, 'manager', "1' OR '1'='1"))).toBe('not-found')
    expect(await kindOf(useCases.decide(manager, 'manager', '', 'approved'))).toBe('not-found')
    expect(queried).toBe(false)
  })
})
