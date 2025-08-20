/*
 * @Author: phil
 * @Date: 2025-08-09 17:52:29
 */
import { createRenderer } from '@pvue/runtime-core'
import { extend } from '@pvue/shared'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

const renderOptions = extend({ patchProp }, nodeOps)

function ensureRenderer() {
  return createRenderer(renderOptions)
}

export const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args)

  return app
}

export * from '@pvue/runtime-core'
