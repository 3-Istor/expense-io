#!/usr/bin/env node
// Hook PreToolUse (Bash) : un `git commit` n'est autorisé que si la moulinette `pr` est verte.
// Né d'une vraie erreur : un commit fait sans voir que la moulinette était rouge (phase 2, SEC-03).
// Code de sortie 2 : Claude Code bloque la commande et montre stderr à l'agent, qui doit corriger puis recommencer.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0) // entrée illisible : ne rien bloquer à tort
}
const command = input?.tool_input?.command ?? ''
if (!/\bgit\b[^|;&]*\bcommit\b/.test(command)) process.exit(0)

const verify = spawnSync('npm', ['run', '-s', 'verify', '--', '--level', 'pr'], { encoding: 'utf8', timeout: 300_000 })
if (verify.status === 0) process.exit(0)

let summary = ''
try {
  summary = readFileSync('verify-summary.md', 'utf8')
} catch {
  summary = (verify.stdout + verify.stderr).slice(-1500)
}
process.stderr.write(`Commit refusé : la moulinette (niveau pr) est ROUGE. Corriger, puis recommiter.\n\n${summary}\n`)
process.exit(2)
