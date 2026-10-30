// Umami (T-0028) : actif seulement avec une URL https et un identifiant de site valide.
import { describe, expect, it } from 'vitest'
import { umamiConfig } from '@/lib/umami'

const ID = '94db1cb1-74f4-4a40-ad6c-962362670409'

describe('configuration Umami', () => {
  it('désactivé sans configuration', () => {
    expect(umamiConfig({})).toBeNull()
    expect(umamiConfig({ UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js' })).toBeNull()
  })
  it('refuse une URL non https ou un identifiant mal formé', () => {
    expect(umamiConfig({ UMAMI_SCRIPT_URL: 'http://umami.local/script.js', UMAMI_WEBSITE_ID: ID })).toBeNull()
    expect(umamiConfig({ UMAMI_SCRIPT_URL: 'javascript:alert(1)', UMAMI_WEBSITE_ID: ID })).toBeNull()
    expect(umamiConfig({ UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js', UMAMI_WEBSITE_ID: 'x" onload="' })).toBeNull()
  })
  it('actif avec une URL https et un identifiant valide', () => {
    expect(umamiConfig({ UMAMI_SCRIPT_URL: ' https://cloud.umami.is/script.js ', UMAMI_WEBSITE_ID: ID })).toEqual({
      scriptUrl: 'https://cloud.umami.is/script.js',
      websiteId: ID,
    })
  })
})
