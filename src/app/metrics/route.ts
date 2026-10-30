// Point de collecte Prometheus (T-0021). Hors du contrat client (docs/openapi.yaml), comme /api/auth : c'est une route
// d'exploitation, pas une route métier. Aucun appel à la base : les compteurs sont en mémoire, les jauges lisent l'état
// du pool PostgreSQL et de l'OCR sans ouvrir de connexion.
import type { Pool } from 'pg'
import { renderMetrics, scrapeAllowed, type Gauge } from '@/lib/metrics'
import { ocrLoad } from '@/lib/ocr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  if (!scrapeAllowed(request.headers.get('authorization'), process.env.METRICS_TOKEN, process.env.NODE_ENV)) {
    return new Response('Unauthorized\n', { status: 401, headers: { 'content-type': 'text/plain' } })
  }
  return new Response(renderMetrics(gauges()), {
    headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** USE : occupation et attente des ressources partagées, lues au moment de la collecte. */
function gauges(): Gauge[] {
  // Le pool est créé à la première requête métier ; on ne le crée pas ici pour une simple collecte.
  const pool = (globalThis as { __pgPool?: Pool }).__pgPool
  const ocr = ocrLoad()
  const db = 'Connexions du pool PostgreSQL (USE : utilisation ; waiting > 0 = saturation)'
  const job = "Tâches d'OCR (USE : utilisation ; waiting > 0 = saturation)"
  return [
    { name: 'db_pool_connections', help: db, labels: { state: 'total' }, value: pool?.totalCount ?? 0 },
    { name: 'db_pool_connections', help: db, labels: { state: 'idle' }, value: pool?.idleCount ?? 0 },
    { name: 'db_pool_connections', help: db, labels: { state: 'waiting' }, value: pool?.waitingCount ?? 0 },
    { name: 'db_pool_max_connections', help: 'Plafond du pool PostgreSQL', value: pool?.options.max ?? 0 },
    { name: 'ocr_jobs', help: job, labels: { state: 'running' }, value: ocr.running },
    { name: 'ocr_jobs', help: job, labels: { state: 'waiting' }, value: ocr.waiting },
    { name: 'ocr_max_concurrent_jobs', help: "Plafond de tâches d'OCR simultanées (SEC-11)", value: ocr.max },
    { name: 'process_resident_memory_bytes', help: 'Mémoire résidente du processus (USE : utilisation)', value: process.memoryUsage().rss },
  ]
}
