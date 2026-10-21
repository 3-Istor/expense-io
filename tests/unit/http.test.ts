// SEC-07 : une erreur inattendue (ex. erreur PostgreSQL) devient un 500 générique, sans stacktrace ni détail SQL.
// Testé ici sur handle(), le point de passage de toutes les routes, en provoquant l'erreur directement.
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '@/shared/app-error'
import { handle } from '@/shared/http'

vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('handle() : traduction des erreurs (SEC-07)', () => {
  it('erreur inattendue : 500 générique, champ stack vide, aucun détail SQL', async () => {
    const res = await handle('op', 401, async () => {
      throw new Error('invalid input syntax for type uuid: "x" at expense_notes.id')
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['error', 'errorId', 'stack'])
    expect(body).toMatchObject({ error: 'Erreur interne', stack: '' })
    expect(JSON.stringify(body)).not.toMatch(/invalid input|expense_notes|uuid:/)
  })
  it('une promesse rejetée plus tard est aussi rattrapée (avant : 500 au corps vide)', async () => {
    const res = await handle('op', 401, () => new Promise((_, reject) => setTimeout(() => reject(new Error('boom')), 5)))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Erreur interne')
  })
  it('erreurs attendues : codes du contrat, refus selon la route (401 ou 403)', async () => {
    const status = async (kind: AppError['kind'], denied: 401 | 403) =>
      (await handle('op', denied, async () => { throw new AppError(kind, 'm') })).status
    expect([await status('invalid', 401), await status('not-found', 401), await status('conflict', 401)]).toEqual([400, 404, 409])
    expect([await status('denied', 401), await status('denied', 403)]).toEqual([401, 403])
  })
})
