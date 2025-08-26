/*
 * @Author: phil
 * @Date: 2025-08-01 20:07:55
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: true,
    __FEATURE_OPTIONS_API__: true,
    __COMPAT__: true,
  },
  test: {
    globals: true,
    setupFiles: 'scripts/setup-vitest.ts',
    environmentMatchGlobs: [
      ['packages/{pvue,vue-compat,runtime-dom}/**', 'jsdom'],
    ],
  },
})
