import { defineConfig } from '@playwright/test'

// Tests d'API de bout en bout : requêtes HTTP directes contre l'app lancée, sans navigateur.
// L'URL peut viser une app déjà démarrée (API_BASE_URL) ; sinon Playwright lance `next dev`.
const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: 'tests/api',
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL },
  webServer: process.env.API_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
