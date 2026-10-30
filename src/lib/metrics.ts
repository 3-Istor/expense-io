// Métriques Prometheus, sans dépendance (T-0021). Le cours 4 demande « RED + métriques métier » ; on applique trois
// standards connus plutôt qu'une liste de métriques au hasard :
// - RED (Tom Wilkie) côté service : débit, erreurs, durée par opération du contrat ;
// - USE (Brendan Gregg) côté ressources : occupation et attente du pool PostgreSQL et de l'OCR ;
// - métier : notes soumises, décidées, délai de décision. L'usage d'une fonctionnalité se lit en divisant ses appels
//   par les notes soumises (exemple : la suggestion OCR, docs/slo.md).
// Les quatre golden signals du SRE Book en découlent : latence, trafic, erreurs (RED), saturation (USE).
// Labels bornés : operationId (liste fixe du contrat), code HTTP, décision, type de valideur. Jamais d'identifiant
// d'utilisateur, de note ou d'entreprise (cardinalité, et aucune donnée d'un client dans les métriques).
// Chaque instance compte pour elle-même, en mémoire : Prometheus additionne les instances qu'il interroge.

import { createHash, timingSafeEqual } from 'node:crypto'

type Labels = Record<string, string>

const HTTP_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 30]
/** 1 h, 1 j, 2 j, 5 j (le SLI métier de docs/slo.md), 10 j (le seuil d'alerte de la plus vieille note). */
const DECISION_BUCKETS = [3600, 86_400, 172_800, 432_000, 864_000]

interface Histogram {
  buckets: number[]
  series: Map<string, { labels: Labels; counts: number[]; sum: number; count: number }>
}

const counters = new Map<string, { help: string; series: Map<string, { labels: Labels; value: number }> }>()
const histograms = new Map<string, Histogram & { help: string }>()

function key(labels: Labels): string {
  return JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)))
}

function inc(name: string, help: string, labels: Labels = {}, by = 1): void {
  let counter = counters.get(name)
  if (!counter) counters.set(name, (counter = { help, series: new Map() }))
  const k = key(labels)
  const serie = counter.series.get(k) ?? { labels, value: 0 }
  serie.value += by
  counter.series.set(k, serie)
}

function observe(name: string, help: string, buckets: number[], value: number, labels: Labels = {}): void {
  let histogram = histograms.get(name)
  if (!histogram) histograms.set(name, (histogram = { help, buckets, series: new Map() }))
  const k = key(labels)
  const serie = histogram.series.get(k) ?? { labels, counts: buckets.map(() => 0), sum: 0, count: 0 }
  buckets.forEach((le, i) => {
    if (value <= le) serie.counts[i]++
  })
  serie.sum += value
  serie.count++
  histogram.series.set(k, serie)
}

/** RED : une requête d'API terminée (appelé par `handle()`, une fois par appel). */
export function recordRequest(operation: string, status: number, durationMs: number): void {
  inc('http_requests_total', "Requêtes d'API terminées, par opération du contrat et code HTTP (RED : débit, erreurs)", {
    operation,
    status: String(status),
  })
  observe('http_request_duration_seconds', "Durée des requêtes d'API (RED : durée ; p95/p99 par histogram_quantile)", HTTP_BUCKETS, durationMs / 1000, { operation })
}

/** Métier : une note soumise. */
export function recordNoteSubmitted(): void {
  inc('expense_notes_submitted_total', 'Notes de frais soumises')
}

/** Métier : une note décidée, et le temps écoulé depuis sa soumission. */
export function recordNoteDecided(decision: string, approver: string, delaySeconds: number): void {
  inc('expense_notes_decided_total', 'Notes de frais décidées, par décision et type de valideur', { decision, approver })
  observe('expense_note_decision_delay_seconds', 'Délai entre la soumission et la décision', DECISION_BUCKETS, delaySeconds, { decision })
}

export interface Gauge {
  name: string
  help: string
  value: number
  labels?: Labels
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function labelText(labels: Labels): string {
  const entries = Object.entries(labels)
  return entries.length ? `{${entries.map(([k, v]) => `${k}="${escape(v)}"`).join(',')}}` : ''
}

/** Format texte d'exposition Prometheus 0.0.4. Les jauges (USE) sont lues au moment de la collecte. */
export function renderMetrics(gauges: Gauge[] = []): string {
  const lines: string[] = []
  for (const [name, counter] of counters) {
    lines.push(`# HELP ${name} ${counter.help}`, `# TYPE ${name} counter`)
    for (const s of counter.series.values()) lines.push(`${name}${labelText(s.labels)} ${s.value}`)
  }
  for (const [name, h] of histograms) {
    lines.push(`# HELP ${name} ${h.help}`, `# TYPE ${name} histogram`)
    for (const s of h.series.values()) {
      h.buckets.forEach((le, i) => lines.push(`${name}_bucket${labelText({ ...s.labels, le: String(le) })} ${s.counts[i]}`))
      lines.push(`${name}_bucket${labelText({ ...s.labels, le: '+Inf' })} ${s.count}`)
      lines.push(`${name}_sum${labelText(s.labels)} ${s.sum}`, `${name}_count${labelText(s.labels)} ${s.count}`)
    }
  }
  const byName = new Map<string, Gauge[]>()
  for (const g of gauges) byName.set(g.name, [...(byName.get(g.name) ?? []), g])
  for (const [name, list] of byName) {
    lines.push(`# HELP ${name} ${list[0].help}`, `# TYPE ${name} gauge`)
    for (const g of list) lines.push(`${name}${labelText(g.labels ?? {})} ${g.value}`)
  }
  return lines.join('\n') + '\n'
}

/** Remet le registre à zéro (tests unitaires seulement). */
export function resetMetrics(): void {
  counters.clear()
  histograms.clear()
}

/**
 * Accès à /metrics. Les compteurs sont agrégés sans identifiant, mais ils additionnent l'activité de toutes les
 * entreprises : les lire ne doit pas être possible depuis Internet. Avec `METRICS_TOKEN`, il faut
 * `Authorization: Bearer <jeton>`. Sans jeton, la route n'est ouverte qu'en développement et en test (démo, TP).
 * Comparaison en temps constant sur des empreintes de même taille : ni le contenu ni la longueur du jeton ne fuient.
 */
export function scrapeAllowed(authorization: string | null, token: string | undefined, nodeEnv: string | undefined): boolean {
  if (!token) return nodeEnv === 'development' || nodeEnv === 'test'
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(authorization ?? ''), digest(`Bearer ${token}`))
}
