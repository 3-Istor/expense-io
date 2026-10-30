// `npm run risk [-- --base <ref>] [--json]` : niveau de risque du changement courant (commits + fichiers modifiés)
// par rapport à la base (origin/main par défaut).
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import { classify, newFileLines, type ChangedFile } from './risk'

// Sortie coupée par `| head` : arrêt propre au lieu d'une exception EPIPE (friction relevée en répétition).
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0)
  throw error
})

const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
// Base : --base, sinon RISK_BASE (branche de départ d'un travail empilé, ex. phase-5/qualite), sinon origin/main.
const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.RISK_BASE || 'origin/main'
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
  // Fichier pas encore suivi par git (une migration qu'on vient d'écrire) : tout son contenu est « ajouté », pour que les
  // règles qui lisent le contenu (RLS, droits, dépendances) le voient avant `git add` (répétition 4, T-0026).
  ...untracked.map((path) => ({ path, status: 'A' as const, added: newFileLines({ stat: () => lstatSync(path), read: () => readFileSync(path) }) })),
]

// Les outils de dev (actuels ou retirés par ce changement) pèsent moins qu'une dépendance d'exécution.
const devOf = (json: string) => Object.keys((JSON.parse(json) as { devDependencies?: object }).devDependencies ?? {})
let devDependencies = devOf(readFileSync('package.json', 'utf8'))
try {
  devDependencies = [...devDependencies, ...devOf(git('show', `${mergeBase}:package.json`))]
} catch {
  // package.json absent de la base : seule la version courante compte.
}
const report = classify(files, { devDependencies })
if (args.includes('--json')) {
  console.log(JSON.stringify({ base, files: files.length, ...report }, null, 2))
} else {
  console.log(`Niveau de risque : ${report.level} (base ${base}, ${files.length} fichier(s))`)
  console.log(`Point de contrôle : ${report.checkpoint}`)
  const top = report.reasons.filter((r) => r.level === report.level).slice(0, 8)
  for (const r of top) console.log(`- niveau ${r.level} : ${r.reason} (${r.file})`)
}
