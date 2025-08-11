import { createRenderer } from '@pvue/runtime-core'
import { extend } from '@pvue/shared'
import { nodeOps } from './nodeOps'

const renderOptions = extend({}, nodeOps)

function ensureRenderer() {
  return createRenderer(renderOptions)
}

export const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args)

  return app
}

export * from '@pvue/runtime-core'
