import { spawnSync } from 'node:child_process'

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
  missing: boolean
}

/** Lance une commande et capture sa sortie, sans jamais lever d'exception. */
export function exec(command: string, args: string[], options: { timeoutMs?: number } = {}): ExecResult {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 300_000,
    maxBuffer: 64 * 1024 * 1024,
  })
  const missing = (result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    missing,
  }
}

/** Dernières lignes utiles d'une sortie, pour un résumé court. */
export function tail(text: string, lines = 5): string {
  return text.trim().split('\n').slice(-lines).join('\n')
}
