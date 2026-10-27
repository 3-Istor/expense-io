import { describe, expect, it } from 'vitest'
import { approverKind, mayDecide } from '@/modules/expense-notes/domain/approvers'
import { checkDecision, validateNewNote } from '@/modules/expense-notes/domain/expense-note'
import { checkReceipt, receiptKeyFor } from '@/modules/expense-notes/domain/receipt'
import { parseSort } from '@/modules/expense-notes/domain/sort'

describe('machine à états d\'une note', () => {
  const pending = { status: 'pending' as const, userId: 'auteur' }
  it('une note en attente peut être approuvée ou rejetée par un autre que son auteur', () => {
    expect(checkDecision(pending, 'approved', 'valideur')).toBeNull()
    expect(checkDecision(pending, 'rejected', 'valideur')).toBeNull()
  })
  it('une note décidée ne peut plus changer', () => {
    for (const status of ['approved', 'rejected'] as const) {
      expect(checkDecision({ status, userId: 'auteur' }, 'approved', 'valideur')).toBe('already-decided')
      expect(checkDecision({ status, userId: 'auteur' }, 'rejected', 'valideur')).toBe('already-decided')
    }
  })
  it('personne ne décide de sa propre note (SEC-06)', () => {
    expect(checkDecision(pending, 'approved', 'auteur')).toBe('self-decision')
  })
})

describe('valideurs', () => {
  it('seul un manager valide côté manager, seul un RH côté RH', () => {
    expect(approverKind('manager', 'manager')).toBe('manager')
    expect(approverKind('hr_admin', 'hr')).toBe('hr')
    expect(approverKind('employee', 'manager')).toBeNull()
    expect(approverKind('hr_admin', 'manager')).toBeNull()
    expect(approverKind('manager', 'hr')).toBeNull()
  })
})

describe('qui valide une note (T-0014)', () => {
  const A = 'entreprise-a'
  const boss = { id: 'boss', companyId: A, managerId: null, role: 'manager' as const }
  const hr = { id: 'rh', companyId: A, managerId: null, role: 'hr_admin' as const }
  const hr2 = { id: 'rh2', companyId: A, managerId: null, role: 'hr_admin' as const }
  const hrB = { id: 'rh-b', companyId: 'entreprise-b', managerId: null, role: 'hr_admin' as const }
  it('un auteur avec manager : seul son manager direct valide, pas le RH', () => {
    const employee = { id: 'emp', companyId: A, managerId: 'boss' }
    expect(mayDecide(boss, employee)).toBe(true)
    expect(mayDecide(hr, employee)).toBe(false)
  })
  it('un auteur sans manager, quel que soit son rôle : un RH de son entreprise valide', () => {
    const orphan = { id: 'orphelin', companyId: A, managerId: null }
    expect(mayDecide(hr, orphan)).toBe(true) // employé sans manager
    expect(mayDecide(hr, boss)).toBe(true) // manager racine
    expect(mayDecide(hr2, hr)).toBe(true) // un RH par un autre RH
    expect(mayDecide(boss, orphan)).toBe(false) // un manager ne remplace pas le RH
  })
  it('jamais soi-même, jamais une autre entreprise', () => {
    expect(mayDecide(hr, hr)).toBe(false)
    expect(mayDecide(hrB, boss)).toBe(false)
  })
})

describe('saisie d\'une note', () => {
  it('refuse un montant nul, négatif ou illisible et une description vide', () => {
    const ok = { amount: '12.5', expenseDate: '2026-10-01', description: 'Taxi' }
    expect(validateNewNote(ok)).toEqual({ amount: 12.5, expenseDate: '2026-10-01', description: 'Taxi' })
    for (const amount of ['0', '-3', 'abc', undefined]) expect(validateNewNote({ ...ok, amount })).toBeNull()
    expect(validateNewNote({ ...ok, description: '   ' })).toBeNull()
  })
  it('n\'accepte que png, jpeg, webp et pdf de 10 Mo au plus', () => {
    expect(checkReceipt({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull()
    expect(checkReceipt({ type: 'text/plain', size: 1 })).toBe('type-not-allowed')
    // Noms hérités du prototype : refusés (même piège que le plafond par catégorie en répétition).
    expect(checkReceipt({ type: 'toString', size: 1 })).toBe('type-not-allowed')
    expect(checkReceipt({ type: 'constructor', size: 1 })).toBe('type-not-allowed')
    expect(checkReceipt({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).toBe('too-large')
    expect(receiptKeyFor(42, 'image/jpeg')).toBe('receipts/42.jpg')
  })
})

describe('tri de la liste (SEC-01)', () => {
  it('accepte une colonne connue, avec ou sans sens', () => {
    expect(parseSort(null)).toEqual({ column: 'created_at', direction: 'DESC' })
    expect(parseSort('amount')).toEqual({ column: 'amount', direction: 'ASC' })
    expect(parseSort(' Expense_Date desc ')).toEqual({ column: 'expense_date', direction: 'DESC' })
  })
  it('refuse tout le reste', () => {
    for (const sort of ['password_hash', 'amount; DROP TABLE users', '(SELECT 1)', 'amount ASC, id']) {
      expect(parseSort(sort)).toBeNull()
    }
  })
})

describe('bornes de la base (trouvées par le fuzzing : 500 avant)', () => {
  const ok = { amount: '12.5', expenseDate: '2026-10-01', description: 'Taxi' }
  it('refuse une date qui n\'existe pas ou mal formée', () => {
    for (const expenseDate of ['2026-13-45', '2026-02-30', '2026-1-01', '01/10/2026', '2026-10-01T00:00:00Z', '']) {
      expect(validateNewNote({ ...ok, expenseDate }), expenseDate).toBeNull()
    }
    expect(validateNewNote({ ...ok, expenseDate: '2024-02-29' })?.expenseDate).toBe('2024-02-29') // bissextile
  })
  it('refuse un montant au-delà de la colonne numeric(10,2)', () => {
    expect(validateNewNote({ ...ok, amount: '99999999.99' })?.amount).toBe(99_999_999.99)
    expect(validateNewNote({ ...ok, amount: '100000000' })).toBeNull()
    expect(validateNewNote({ ...ok, amount: '1e20' })).toBeNull()
  })
})

describe('cas limites (tests de mutation)', () => {
  const ok = { amount: '12.5', expenseDate: '2026-10-01', description: 'Taxi' }
  it('refuse un montant qui n\'est pas une chaîne, une date ou une description du mauvais type', () => {
    expect(validateNewNote({ ...ok, amount: 12.5 })).toBeNull()
    expect(validateNewNote({ ...ok, expenseDate: 20261001 })).toBeNull()
    expect(validateNewNote({ ...ok, description: 42 })).toBeNull()
  })
  it('clé de reçu pour chaque type accepté', () => {
    expect(receiptKeyFor(1, 'image/png')).toBe('receipts/1.png')
    expect(receiptKeyFor(2, 'image/webp')).toBe('receipts/2.webp')
    expect(receiptKeyFor(3, 'application/pdf')).toBe('receipts/3.pdf')
    expect(receiptKeyFor(4, 'text/plain')).toBe('receipts/4')
  })
  it('le tri est ancré et tolère plusieurs espaces', () => {
    expect(parseSort('1amount')).toBeNull()
    expect(parseSort('amount  desc')).toEqual({ column: 'amount', direction: 'DESC' })
  })
})
