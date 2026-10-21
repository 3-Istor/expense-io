// `npm run risk [-- --base <ref>] [--json]` : niveau de risque du changement courant (commits + fichiers modifiés)
// par rapport à la base (origin/main par défaut).
import { execFileSync } from 'node:child_process'
import { classify, type ChangedFile } from './risk'

const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
const base = baseIndex >= 0 ? args[baseIndex + 1] : 'origin/main'
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' })

// Fusion des changements commités depuis la base et des changements locaux non commités.
const mergeBase = git('merge-base', base, 'HEAD').trim()
const statusLines = git('diff', '--name-status', '--find-renames', mergeBase).trim().split('\n').filter(Boolean)
const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean)

const files: ChangedFile[] = [
  ...statusLines.map((line) => {
    const [status, ...paths] = line.split('\t')
    const path = paths.at(-1)!
    const added =
      status[0] === 'D'
        ? []
        : git('diff', mergeBase, '--unified=0', '--', path)
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .map((l) => l.slice(1))
    return { path, status: status[0] as ChangedFile['status'], added }
  }),
  ...untracked.map((path) => ({ path, status: 'A' as const, added: [] })),
]

const report = classify(files)
if (args.includes('--json')) {
  console.log(JSON.stringify({ base, files: files.length, ...report }, null, 2))
} else {
  console.log(`Niveau de risque : ${report.level} (base ${base}, ${files.length} fichier(s))`)
  console.log(`Point de contrôle : ${report.checkpoint}`)
  const top = report.reasons.filter((r) => r.level === report.level).slice(0, 8)
  for (const r of top) console.log(`- niveau ${r.level} : ${r.reason} (${r.file})`)
}
