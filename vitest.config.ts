import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    // tests/integration : contre une vraie base (npm run test:db) ; npm test ne lance que les tests sans base.
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    // Couverture au format lcov, lue par SonarQube (sonar-project.properties).
    coverage: { provider: 'v8', include: ['src/**'], reporter: ['text-summary', 'lcov'], reportsDirectory: 'coverage' },
  },
})
