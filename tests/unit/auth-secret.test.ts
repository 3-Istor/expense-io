import { describe, expect, it } from 'vitest'
import { requireAuthSecret } from '@/lib/auth-secret'

describe('requireAuthSecret (SEC-02)', () => {
  it('refuse un secret absent ou trop court', () => {
    expect(() => requireAuthSecret({})).toThrow(/AUTH_SECRET/)
    expect(() => requireAuthSecret({ AUTH_SECRET: 'court' })).toThrow(/32 caractères/)
  })
  it('renvoie le secret de l\'environnement', () => {
    const secret = 'x'.repeat(32)
    expect(requireAuthSecret({ AUTH_SECRET: secret })).toBe(secret)
  })
})
