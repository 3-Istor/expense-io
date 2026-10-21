export type Level = 'fast' | 'pr' | 'nightly'
export type Status = 'pass' | 'fail' | 'warn' | 'skip'

export interface CheckResult {
  status: Status
  /** Une ligne, lisible par l'humain comme par l'agent. */
  summary: string
  /** Mesures chiffrées suivies dans le temps (docs/metrics/history.csv). */
  metrics?: Record<string, number>
  details?: unknown
}

export interface Check {
  id: string
  title: string
  /** Le risque couvert : pas de contrôle sans risque nommé. */
  risk: string
  levels: Level[]
  /** Un contrôle bloquant en échec fait échouer la moulinette. */
  blocking: boolean
  run(): Promise<CheckResult>
}
