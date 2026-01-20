import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, 'tests/setup.ts')],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    coverage: {
      enabled: false
    }
  }
})
