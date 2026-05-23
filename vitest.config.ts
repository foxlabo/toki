import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
