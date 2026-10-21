import { expect, test } from '@playwright/test'

// Test de fumée : l'app répond et une route protégée refuse un appel sans session (contrat : 401).
test('GET /api/expense-notes sans session renvoie 401', async ({ request }) => {
  const response = await request.get('/api/expense-notes')
  expect(response.status()).toBe(401)
})
