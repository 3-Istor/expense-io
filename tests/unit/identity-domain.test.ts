// Tests ciblés par les tests de mutation (Stryker) : chaque cas tue au moins une mutation qui survivait.
import { describe, expect, it } from 'vitest'
import { checkManagerAssignment, emailDomain, parseManagerAssignment, validateRegistration } from '@/modules/identity/domain/user'

const UUID = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('corps du rattachement de manager', () => {
  it('accepte { managerId: uuid } et { managerId: null }, exactement', () => {
    expect(parseManagerAssignment({ managerId: UUID })).toEqual({ managerId: UUID })
    expect(parseManagerAssignment({ managerId: UUID.toUpperCase() })).toEqual({ managerId: UUID.toUpperCase() })
    expect(parseManagerAssignment({ managerId: null })).toEqual({ managerId: null })
  })
  it('refuse tout le reste', () => {
    for (const body of [null, undefined, 'x', 42, [UUID], {}, { autre: UUID }, { managerId: 42 }, { managerId: undefined }]) {
      expect(parseManagerAssignment(body), JSON.stringify(body)).toBeNull()
    }
  })
  it('refuse un uuid mal formé, segment par segment', () => {
    for (const bad of [
      `x${UUID}`, `${UUID}x`, 'g'.repeat(8) + UUID.slice(8), UUID.slice(1),
      '0f8fad5b-d9c-469f-a165-70867728950e', '0f8fad5b-d9cb-469-a165-70867728950e', '0f8fad5b-d9cb-469f-a16-70867728950e',
      '0f8fad5b-d9cb-469f-a165-70867728950', '0f8fad5b-zzzz-469f-a165-70867728950e', '0f8fad5b-d9cb-zzzz-a165-70867728950e',
      '0f8fad5b-d9cb-469f-zzzz-70867728950e', '0f8fad5b-d9cb-469f-a165-zzzzzzzzzzzz', 'zzzzzzzz-d9cb-469f-a165-70867728950e',
    ]) {
      expect(parseManagerAssignment({ managerId: bad }), bad).toBeNull()
    }
  })
  it('se rattacher à soi-même est refusé, mais pas un détachement ni un autre manager', () => {
    expect(checkManagerAssignment(UUID, UUID)).toBe('self')
    expect(checkManagerAssignment(UUID, null)).toBeNull()
    expect(checkManagerAssignment(UUID, '11111111-1111-4111-8111-111111111111')).toBeNull()
  })
})

describe('inscription', () => {
  const ok = { name: 'Alice', email: 'alice@x.io', password: 'motdepasse' }
  it('accepte une inscription valide', () => {
    expect(validateRegistration(ok)).toEqual({ ...ok, domain: 'x.io' })
  })
  it('refuse nom, email ou mot de passe absents, vides ou du mauvais type', () => {
    for (const bad of [
      { ...ok, name: 42 }, { ...ok, name: '   ' }, { ...ok, email: 42 }, { ...ok, email: 'pas-un-email' },
      { ...ok, password: 12345678 }, { ...ok, password: 'court' },
    ]) {
      expect(validateRegistration(bad), JSON.stringify(bad)).toBeNull()
    }
    expect(validateRegistration({ ...ok, password: '12345678' })?.password).toBe('12345678') // 8 = minimum
  })
  it('l\'email est ancré : rien avant ni après', () => {
    expect(emailDomain('alice@x.io suite')).toBeNull()
    expect(emailDomain('alice@x.io\n')).toBeNull()
  })
})
