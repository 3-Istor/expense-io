// Rapport de couverture des tests d'API à partir de la couverture V8 brute (NODE_V8_COVERAGE) du serveur Next.js,
// ramenée aux fichiers de src/ par les source maps des bundles (monocart-coverage-reports).
import { existsSync, readFileSync } from 'node:fs'
import { CoverageReport } from 'monocart-coverage-reports'

// monocart préfixe chaque source par le nom du package, y compris celles de Next (qui a aussi un dossier src/) :
// on ne garde que les sources qui existent dans CE dépôt.
const project = JSON.parse(readFileSync('package.json', 'utf8')).name
const relative = (p) => p.replace(`${project}/`, '')
const ours = (p) => relative(p).startsWith('src/') && existsSync(relative(p))

// Deux rapports : le code serveur (routes, modules, lib), que les tests d'API exercent, et l'interface (pages et
// composants React), qu'ils ne peuvent pas exercer (pas de navigateur) : ne pas mélanger les deux chiffres.
const isUi = (p) => /\.tsx$/.test(relative(p))
for (const [name, dir, keep] of [
  ['serveur', 'coverage/api', (p) => ours(p) && !isUi(p)],
  ['interface', 'coverage/api-ui', (p) => ours(p) && isUi(p)],
]) {
  const report = new CoverageReport({
    name: `Couverture des tests d'API : ${name}`,
    outputDir: dir,
    reports: ['console-summary', 'lcovonly', 'json-summary'],
    entryFilter: (entry) => entry.url.includes('/.next/server/'),
    sourceFilter: keep,
    sourcePath: relative,
  })
  await report.addFromDir(process.argv[2])
  await report.generate()
}
