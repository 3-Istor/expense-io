// Journaux structurés : une ligne JSON par événement sur la sortie standard, lisible par n'importe quel collecteur
// (Kubernetes, Loki, CloudWatch). Sans dépendance. Les SLI de docs/slo.md se calculent à partir de ces lignes.
// Chaque ligne écrite pendant une requête d'API porte son `requestId` (cours 4 : corréler les journaux d'une requête).
import { AsyncLocalStorage } from 'node:async_hooks'

type Level = 'info' | 'warn' | 'error'

const request = new AsyncLocalStorage<{ requestId: string }>()

/** Exécute `run` dans le contexte d'une requête : toutes les lignes de journal écrites pendant `run` portent `requestId`. */
export function withRequestId<T>(requestId: string, run: () => T): T {
  return request.run({ requestId }, run)
}

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const requestId = request.getStore()?.requestId
  const line = JSON.stringify(
    { time: new Date().toISOString(), level, msg, ...(requestId ? { requestId } : {}), ...fields },
    (_key, value) => (value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value),
  )
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
