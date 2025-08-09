/*
 * @Author: phil
 * @Date: 2025-08-01 20:07:55
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    globals: true,
    setupFiles: 'scripts/setup-vitest.ts',
  },
})
