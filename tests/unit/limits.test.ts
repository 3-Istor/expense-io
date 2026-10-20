import { describe, expect, it, vi } from 'vitest'
import { createLimiter, withTimeout } from '@/lib/limits'

describe('withTimeout (SEC-11)', () => {
  it('rejette et libère la ressource après le délai', async () => {
    const release = vi.fn()
    await expect(withTimeout(new Promise(() => {}), 20, release)).rejects.toThrow(/Délai dépassé/)
    expect(release).toHaveBeenCalledOnce()
  })
  it('renvoie le résultat dans les temps', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })
})

describe('createLimiter (SEC-11)', () => {
  it('ne lance jamais plus de N tâches à la fois', async () => {
    const limit = createLimiter(2)
    let running = 0
    let peak = 0
    const task = () =>
      limit(async () => {
        peak = Math.max(peak, ++running)
        await new Promise((r) => setTimeout(r, 10))
        running--
      })
    await Promise.all(Array.from({ length: 6 }, task))
    expect(peak).toBe(2)
  })
})
