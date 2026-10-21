import { describe, expect, it } from 'vitest'
import { ExpenseNote } from '@/domain/ExpenseNote'

// Test de fumée : vérifie que Vitest résout les alias et exécute du TypeScript du projet.
describe('environnement de test', () => {
  it('exécute du code du domaine', () => {
    const note = new ExpenseNote({
      id: 'n1',
      userId: 'u1',
      amount: 12.5,
      expenseDate: '2026-10-20',
      description: 'Taxi',
      receiptKey: 'receipts/1.png',
      status: 'pending',
    })
    expect(note.approve().status).toBe('approved')
  })
})
