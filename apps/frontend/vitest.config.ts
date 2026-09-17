import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

const PHOSPHOR_ICONS = '@phosphor-icons/react'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: './vitest.setup.ts',
      include: ['src/**/*.test.{ts,tsx}'],
      deps: {
        optimizer: {
          client: { enabled: true, include: [PHOSPHOR_ICONS] },
        },
      },
    },
  }),
)
