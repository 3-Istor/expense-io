// Tests unitaires seuls (sans base) : utilisé par les tests de mutation (stryker.config.json).
import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config'

export default mergeConfig(base, defineConfig({ test: { include: ['tests/unit/**/*.test.ts'] } }))
