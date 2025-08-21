import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __DEV__: true,
    __FEATURE_OPTIONS_API__: true,
    __COMPAT__: true,
  },
})
