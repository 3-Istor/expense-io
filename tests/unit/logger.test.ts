import { describe, expect, it, vi } from 'vitest'
import { log } from '@/lib/logger'

describe('journaux structurés', () => {
  it('écrit une ligne JSON par événement, avec l\'erreur sérialisée', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('error', 'erreur inattendue', { errorId: 'e1', error: new Error('boom') })
    const line = JSON.parse(spy.mock.calls[0][0] as string)
    expect(line).toMatchObject({ level: 'error', msg: 'erreur inattendue', errorId: 'e1', error: { name: 'Error', message: 'boom' } })
    expect(new Date(line.time).toISOString()).toBe(line.time)
    spy.mockRestore()
  })
})
