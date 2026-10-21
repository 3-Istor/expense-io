import { execFileSync } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { ensureAuthSecret } from '@/lib/auth-secret'

// Décision de Brian (2026-10-21) : l'app doit démarrer sans configuration (moulinette des profs). Le secret absent est
// donc remplacé par un secret aléatoire au lieu d'arrêter l'app ; un secret public n'est jamais accepté (SEC-02).
vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('ensureAuthSecret (SEC-02)', () => {
  it('garde un secret fourni et sûr', () => {
    const secret = 'x'.repeat(32)
    expect(ensureAuthSecret({ AUTH_SECRET: secret })).toBe(secret)
  })

  it('génère un secret aléatoire si absent, et le partage via l\'environnement', () => {
    const env: Record<string, string | undefined> = {}
    const secret = ensureAuthSecret(env)
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
    expect(env.AUTH_SECRET).toBe(secret)
    expect(ensureAuthSecret(env)).toBe(secret) // second appel (autre module) : même secret
    expect(ensureAuthSecret({})).not.toBe(secret) // jamais une valeur fixe
  })

  it('refuse les secrets publics : l\'ancien secret du dépôt et la valeur de .env.example', () => {
    const leaked = /AUTH_SECRET = '([^']+)'/.exec(
      execFileSync('git', ['show', '265924b:src/lib/auth.ts'], { encoding: 'utf8' }),
    )![1]
    for (const publicValue of [leaked, 'changeme-generate-a-real-secret-for-non-local-use']) {
      expect(ensureAuthSecret({ AUTH_SECRET: publicValue })).not.toBe(publicValue)
    }
  })

  it('refuse un secret fourni mais trop court', () => {
    expect(() => ensureAuthSecret({ AUTH_SECRET: 'court' })).toThrow(/32 caractères/)
  })
})

describe('ensureAuthSecret, cas limites (tests de mutation)', () => {
  it('ignore les espaces autour du secret', () => {
    const secret = 'y'.repeat(32)
    expect(ensureAuthSecret({ AUTH_SECRET: `  ${secret}\n` })).toBe(secret)
  })
  it('avertit, avec un message différent selon la cause', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ensureAuthSecret({})
    ensureAuthSecret({ AUTH_SECRET: 'changeme-generate-a-real-secret-for-non-local-use' })
    const messages = warn.mock.calls.map((c) => JSON.parse(c[0] as string))
    expect(messages.map((m) => m.level)).toEqual(['warn', 'warn'])
    expect(messages[0].msg).toMatch(/absent.*En production, fixer AUTH_SECRET/)
    expect(messages[1].msg).toMatch(/valeur publique connue/)
    warn.mockRestore()
  })
})
