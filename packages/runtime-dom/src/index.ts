import { createRender } from '@pvue/runtime-core'

function ensureRenderer() {
  return createRender()
}

export const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args)

  return app
}

export * from '@pvue/runtime-core'
