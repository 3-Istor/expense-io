// Génère docs/openapi.yaml depuis le contrat déclaré dans le code (src/contract). Usage :
//   npm run contract:generate          écrit le fichier
//   npm run contract:generate -- --check   échoue si le fichier commité n'est pas à jour (moulinette, S5)
import { readFileSync, writeFileSync } from 'node:fs'
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { stringify } from 'yaml'
import { registry } from '../src/contract/operations'

const TARGET = 'docs/openapi.yaml'

const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Expense.io API',
    version: '0.2.0',
    description:
      'Généré depuis src/contract (ADR 0001) : ne pas modifier à la main, lancer `npm run contract:generate`.\n' +
      'Chaque réponse des tests de contrat (`tests/api/contract.spec.ts`) est validée contre ce document.\n' +
      'Retirer un champ, changer un code HTTP ou une valeur d\'enum exige un ADR (`docs/contract.md`).\n',
    contact: { name: 'Équipe 3-Istor', url: 'https://github.com/3-Istor/expense-io' },
    license: { name: 'Projet pédagogique ARLA', identifier: 'UNLICENSED' },
  },
  servers: [{ url: '/', description: "Même origine que l'application" }],
  security: [{ session: [] }],
  tags: [
    { name: 'notes', description: "Notes de frais de l'utilisateur connecté" },
    { name: 'manager', description: 'Validation par le manager direct' },
    { name: 'hr', description: 'Validation des managers racine et annuaire RH' },
  ],
})

const header = '# Fichier généré par scripts/generate-openapi.ts depuis src/contract : ne pas modifier à la main.\n'
const yaml = header + stringify(document, { lineWidth: 0 })

if (process.argv.includes('--check')) {
  const current = readFileSync(TARGET, 'utf8')
  if (current !== yaml) {
    console.error(`${TARGET} n'est pas à jour avec src/contract : lancer \`npm run contract:generate\` et commiter.`)
    process.exit(1)
  }
  console.log(`${TARGET} est à jour.`)
} else {
  writeFileSync(TARGET, yaml)
  console.log(`${TARGET} généré.`)
}
