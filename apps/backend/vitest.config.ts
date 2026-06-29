import { loadEnv } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'

const GUARD_SETUP = './test/guard-test-db.ts'
const GLOBAL_SETUP = './test/global-setup.ts'
const INTEGRATION_GLOB = 'src/**/*.integration.test.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    test: {
      projects: [
        {
          // Pure unit tests — no database. Run in parallel.
          test: {
            name: 'unit',
            environment: 'node',
            globals: false,
            include: ['src/**/*.test.ts'],
            exclude: [...configDefaults.exclude, INTEGRATION_GLOB],
            env,
          },
        },
        {
          // Integration tests share the single loon_test database and clean it
          // between tests, so files must run serially to avoid clobbering each other.
          test: {
            name: 'integration',
            environment: 'node',
            globals: false,
            include: [INTEGRATION_GLOB],
            env,
            globalSetup: [GLOBAL_SETUP],
            setupFiles: [GUARD_SETUP],
            fileParallelism: false,
          },
        },
      ],
    },
  }
})
