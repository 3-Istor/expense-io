import { describe, expect, it } from 'vitest'
import { approverKind } from '@/modules/expense-notes/domain/approvers'
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

describe('saisie d\'une note', () => {
  it('refuse un montant nul, négatif ou illisible et une description vide', () => {
    const ok = { amount: '12.5', expenseDate: '2026-10-01', description: 'Taxi' }
    expect(validateNewNote(ok)).toEqual({ amount: 12.5, expenseDate: '2026-10-01', description: 'Taxi', category: 'autre' })
    for (const amount of ['0', '-3', 'abc', undefined]) expect(validateNewNote({ ...ok, amount })).toBeNull()
    expect(validateNewNote({ ...ok, description: '   ' })).toBeNull()
  })
  it('n\'accepte que png, jpeg, webp et pdf de 10 Mo au plus', () => {
    expect(checkReceipt({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull()
    expect(checkReceipt({ type: 'text/plain', size: 1 })).toBe('type-not-allowed')
    expect(checkReceipt({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).toBe('too-large')
    expect(receiptKeyFor(42, 'image/jpeg')).toBe('receipts/42.jpg')
  })
})

describe('plafonds par catégorie', () => {
  const ok = { amount: '30', expenseDate: '2026-10-01', description: 'Repas client' }
  it('accepte au plafond, refuse au-dessus, refuse une catégorie inconnue', () => {
    expect(validateNewNote({ ...ok, category: 'repas' })?.category).toBe('repas')
    expect(validateNewNote({ ...ok, amount: '30.01', category: 'repas' })).toBeNull()
    expect(validateNewNote({ ...ok, amount: '99999', category: 'autre' })?.category).toBe('autre') // sans plafond
    expect(validateNewNote({ ...ok, category: 'casino' })).toBeNull()
    expect(validateNewNote({ ...ok, category: 42 })).toBeNull()
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
