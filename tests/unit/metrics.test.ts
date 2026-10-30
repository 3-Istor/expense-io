// Registre de métriques (T-0021) : format d'exposition Prometheus, histogrammes cumulés, labels échappés, accès.
import { beforeEach, describe, expect, it } from 'vitest'
import { createLimiter } from '@/lib/limits'
import { recordNoteDecided, recordNoteSubmitted, recordRequest, renderMetrics, resetMetrics, scrapeAllowed } from '@/lib/metrics'

beforeEach(() => resetMetrics())

describe('métriques Prometheus', () => {
  it('RED : compte par opération et code, durée en secondes dans des seaux cumulés', () => {
    recordRequest('listMyExpenseNotes', 200, 40)
    recordRequest('listMyExpenseNotes', 200, 300)
    recordRequest('listMyExpenseNotes', 500, 2000)
    const text = renderMetrics()
    expect(text).toContain('# TYPE http_requests_total counter')
    expect(text).toContain('http_requests_total{operation="listMyExpenseNotes",status="200"} 2')
    expect(text).toContain('http_requests_total{operation="listMyExpenseNotes",status="500"} 1')
    expect(text).toContain('http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.05"} 1')
    expect(text).toContain('http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.5"} 2')
    expect(text).toContain('http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="+Inf"} 3')
    expect(text).toContain('http_request_duration_seconds_count{operation="listMyExpenseNotes"} 3')
    expect(text).toContain('http_request_duration_seconds_sum{operation="listMyExpenseNotes"} 2.34')
  })
  it('métier : notes soumises, décidées et délai de décision', () => {
    recordNoteSubmitted()
    recordNoteDecided('approved', 'manager', 7200)
    const text = renderMetrics()
    expect(text).toContain('expense_notes_submitted_total 1')
    expect(text).toContain('expense_notes_decided_total{decision="approved",approver="manager"} 1')
    expect(text).toContain('expense_note_decision_delay_seconds_bucket{decision="approved",le="3600"} 0')
    expect(text).toContain('expense_note_decision_delay_seconds_bucket{decision="approved",le="86400"} 1')
  })
  it('jauges USE et échappement des labels', () => {
    const text = renderMetrics([
      { name: 'ocr_jobs', help: 'OCR', labels: { state: 'run"ning\\' }, value: 2 },
      { name: 'ocr_jobs', help: 'OCR', labels: { state: 'waiting' }, value: 0 },
    ])
    expect(text.match(/# TYPE ocr_jobs gauge/g)).toHaveLength(1)
    expect(text).toContain('ocr_jobs{state="run\\"ning\\\\"} 2')
    expect(text).toContain('ocr_jobs{state="waiting"} 0')
  })
  it("l'occupation du limiteur d'OCR est lisible (USE)", async () => {
    const limit = createLimiter(1)
    let release!: () => void
    const first = limit(() => new Promise<void>((r) => (release = r)))
    const second = limit(async () => {})
    await new Promise((r) => setTimeout(r, 0))
    expect(limit.stats()).toEqual({ running: 1, waiting: 1, max: 1 })
    release()
    await Promise.all([first, second])
    expect(limit.stats()).toEqual({ running: 0, waiting: 0, max: 1 })
  })
})

describe('accès à /metrics', () => {
  it('sans jeton : ouvert en développement et en test seulement, fermé en production', () => {
    expect(scrapeAllowed(null, undefined, 'development')).toBe(true)
    expect(scrapeAllowed(null, undefined, 'test')).toBe(true)
    expect(scrapeAllowed(null, undefined, 'production')).toBe(false)
    expect(scrapeAllowed(null, undefined, undefined)).toBe(false)
  })
  it('avec jeton : seul le bon Bearer passe, quel que soit l’environnement', () => {
    expect(scrapeAllowed(null, 's3cret-de-test', 'development')).toBe(false)
    expect(scrapeAllowed('Bearer autre', 's3cret-de-test', 'production')).toBe(false)
    expect(scrapeAllowed('Bearer s3cret-de-test-plus-long', 's3cret-de-test', 'production')).toBe(false)
    expect(scrapeAllowed('Bearer s3cret-de-test', 's3cret-de-test', 'production')).toBe(true)
  })
})
