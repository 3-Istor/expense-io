import { describe, expect, it } from 'vitest'
import { checkDecision } from '@/modules/expense-notes/domain/expense-note'

// Test de fumée : vérifie que Vitest résout les alias et exécute du TypeScript du projet.
describe('environnement de test', () => {
  it('exécute du code du domaine', () => {
    expect(checkDecision({ status: 'pending', userId: 'u1' }, 'approved', 'u2')).toBeNull()
  })
})
