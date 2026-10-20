import { defineConfig } from '@playwright/test'
import { TEST_ENV } from './tests/support/env'

// Tests d'API de bout en bout : requêtes HTTP directes contre l'app lancée, sans navigateur.
// L'URL peut viser une app déjà démarrée (API_BASE_URL) ; sinon Playwright lance `next dev`.
const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: 'tests/api',
  fullyParallel: false,
  // En CI, le reporter github transforme chaque échec en annotation sur la PR.
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { baseURL },
  webServer: process.env.API_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        // Base et S3 de test passés explicitement : les tests ne dépendent pas d'un fichier .env.
        env: TEST_ENV,
        timeout: 120_000,
      },
})
