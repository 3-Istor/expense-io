// Validation des réponses contre docs/openapi.yaml : chaque réponse des tests de caractérisation est comparée au
// schéma de son opération (chemin, méthode, code). On enregistre aussi quelles opérations et quels codes ont été
// exercés, pour mesurer la couverture du contrat.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { parse } from 'yaml'
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test'

type Spec = { paths: Record<string, Record<string, { responses: Record<string, unknown> }>> }

const spec = parse(readFileSync(path.join(__dirname, '../../docs/openapi.yaml'), 'utf8')) as Spec
const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
ajv.addSchema(spec, 'openapi')

const routes = Object.keys(spec.paths).map((template) => ({
  template,
  regex: new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`),
}))

/** Codes exercés, par opération : "GET /api/expense-notes" → {"200", "401"}. */
const exercised = new Map<string, Set<string>>()

const pointer = (...parts: string[]) => parts.map((p) => p.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')

async function checkAgainstSpec(method: string, res: APIResponse): Promise<void> {
  const { pathname } = new URL(res.url())
  if (pathname.startsWith('/api/auth/')) return // routes Auth.js, hors contrat
  const route = routes.find((r) => r.regex.test(pathname))
  const op = `${method.toUpperCase()} ${route?.template ?? pathname}`
  expect.soft(route, `${op} : chemin absent de docs/openapi.yaml`).toBeDefined()
  if (!route) return
  const operation = spec.paths[route.template][method.toLowerCase()]
  expect.soft(operation, `${op} : méthode absente de docs/openapi.yaml`).toBeDefined()
  if (!operation) return
  const status = String(res.status())
  if (!exercised.has(op)) exercised.set(op, new Set())
  exercised.get(op)!.add(status)
  expect.soft(operation.responses[status], `${op} : code ${status} non documenté`).toBeDefined()
  if (!operation.responses[status]) return

  let ref = `openapi#/${pointer('paths', route.template, method.toLowerCase(), 'responses', status)}`
  const declared = operation.responses[status] as { $ref?: string }
  if (declared.$ref) ref = `openapi${declared.$ref}`
  const validate = ajv.getSchema(`${ref}/content/application~1json/schema`)
  if (!validate) return // réponse documentée sans corps JSON
  const body = await res.json()
  const valid = validate(body)
  expect.soft(valid, `${op} ${status} : réponse non conforme — ${ajv.errorsText(validate.errors)}`).toBe(true)
}

/** Enveloppe un client HTTP : chaque réponse est validée contre le contrat. */
export function withContractCheck(ctx: APIRequestContext): APIRequestContext {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver)
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(String(prop))) {
        return typeof original === 'function' ? original.bind(target) : original
      }
      return async (url: string, options?: object) => {
        const res: APIResponse = await original.call(target, url, options)
        await checkAgainstSpec(String(prop), res)
        return res
      }
    },
  })
}

/** Opérations et codes documentés (hors 500) jamais exercés par les tests. */
export function uncovered(): string[] {
  const missing: string[] = []
  for (const [template, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const op = `${method.toUpperCase()} ${template}`
      for (const status of Object.keys(operation.responses)) {
        if (status !== '500' && !exercised.get(op)?.has(status)) missing.push(`${op} ${status}`)
      }
    }
  }
  return missing
}
