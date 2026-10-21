// Journaux structurés : une ligne JSON par événement sur la sortie standard, lisible par n'importe quel collecteur
// (Kubernetes, Loki, CloudWatch). Sans dépendance. Les SLI de docs/slo.md se calculent à partir de ces lignes.
type Level = 'info' | 'warn' | 'error'

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }, (_key, value) =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
  )
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
