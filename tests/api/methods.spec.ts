// Méthodes HTTP non déclarées par le contrat : chaque route doit les refuser par 405, sans exécuter de code métier.
// Liste dérivée de docs/openapi.yaml (aucune route oubliée). Complète le fuzzing (FP-FUZZ-03 dans
// docs/security/false-positives.md) : Next.js renvoie 405 mais sans l'en-tête Allow, limite acceptée et suivie ici.
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { parse } from 'yaml'

const spec = parse(readFileSync('docs/openapi.yaml', 'utf8')) as { paths: Record<string, Record<string, unknown>> }
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
const SOME_ID = '00000000-0000-4000-8000-000000000000'

for (const [path, operations] of Object.entries(spec.paths)) {
  const declared = Object.keys(operations).map((m) => m.toUpperCase())
  const url = path.replace('{id}', SOME_ID)
  for (const method of METHODS.filter((m) => !declared.includes(m))) {
    test(`${method} ${path} (non déclarée) → 405`, async ({ request }) => {
      const res = await request.fetch(url, { method })
      expect(res.status()).toBe(405)
    })
  }
}
