// Format des erreurs (ADR 0005) : RFC 9457 sur demande, format historique sinon.
import { describe, expect, it } from 'vitest'
import { respondError } from '../../src/lib/errors'
import { errorResponse, wantsProblem } from '../../src/shared/problem'

describe('erreurs RFC 9457 négociées', () => {
  it('reconnaît la demande explicite, avec ou sans paramètres', () => {
    expect(wantsProblem('application/problem+json')).toBe(true)
    expect(wantsProblem('application/json;q=0.9, application/problem+json;q=1')).toBe(true)
    expect(wantsProblem('application/json')).toBe(false)
    expect(wantsProblem('*/*')).toBe(false) // pas de changement pour un client qui accepte tout
    expect(wantsProblem(null)).toBe(false)
  })
  it('format historique inchangé par défaut', async () => {
    const res = errorResponse(404, 'not-found', 'Not found', { problem: false })
    expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })
  it('problem+json : status égal au code, error gardé', async () => {
    const res = errorResponse(409, 'conflict', 'Déjà décidée', { problem: true })
    expect(res.headers.get('content-type')).toBe('application/problem+json')
    expect(await res.json()).toEqual({
      type: 'urn:expense-io:problem:conflict', title: 'Conflit avec l’état de la ressource', status: 409, detail: 'Déjà décidée', error: 'Déjà décidée',
    })
  })
  it('500 : rien d\'interne ne sort, dans les deux formats', async () => {
    const legacy = await respondError(new Error('SELECT secret FROM x')).json()
    expect(Object.keys(legacy).sort()).toEqual(['error', 'errorId', 'stack'])
    expect(legacy.stack).toBe('')
    const problem = await respondError(new Error('SELECT secret FROM x'), true).json()
    expect(problem).toMatchObject({ type: 'urn:expense-io:problem:internal', status: 500, stack: '' })
    expect(JSON.stringify(problem)).not.toContain('secret')
  })
})
